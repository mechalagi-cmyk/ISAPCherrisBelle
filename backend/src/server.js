require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET. Copy .env.example to .env and set JWT_SECRET.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Starter data only. Data is reset whenever the server restarts.
// Replace these arrays with a database before treating this as a production system.
const products = [
  { id: 1, name: "Pink Cardigan", price: 250000, category: "Cardigan", sizes: ["S", "M", "L"], stock: 10 },
  { id: 2, name: "Love Cardigan", price: 275000, category: "Cardigan", sizes: ["S", "M", "L"], stock: 8 },
  { id: 3, name: "Amice Sweater", price: 290000, category: "Sweater", sizes: ["S", "M", "L"], stock: 6 },
  { id: 4, name: "Joanne Cardigan", price: 260000, category: "Cardigan", sizes: ["S", "M", "L"], stock: 7 },
  { id: 5, name: "Harlyn Sweater", price: 285000, category: "Sweater", sizes: ["S", "M", "L"], stock: 5 }
];

const users = [];
const carts = new Map(); // userId -> [{ productId, size, quantity }]
const orders = [];
const pickups = [];
let nextUserId = 1;
let nextOrderId = 1;
let nextPickupId = 1;

function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "A Bearer token is required.");
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return sendError(res, 401, "Token is invalid or expired.");
  }
}

function getCart(userId) {
  if (!carts.has(userId)) carts.set(userId, []);
  return carts.get(userId);
}

function cartDetails(userId) {
  const items = getCart(userId).map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      size: item.size,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items, subtotal, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
}

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "CherrisBelle API is running." });
});

// PRODUCTS
app.get("/api/products", (req, res) => {
  let result = products;
  if (req.query.category) {
    result = result.filter(p => p.category.toLowerCase() === String(req.query.category).toLowerCase());
  }
  res.json({ success: true, data: result });
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 400, "Product id must be an integer.");
  const product = products.find(p => p.id === id);
  if (!product) return sendError(res, 404, "Product not found.");
  res.json({ success: true, data: product });
});

// ACCOUNTS
app.post("/api/auth/register", async (req, res) => {
  const { fullName, username, email, password, confirmPassword } = req.body || {};
  if (![fullName, username, email, password].every(v => typeof v === "string" && v.trim())) {
    return sendError(res, 400, "fullName, username, email, and password are required.");
  }
  if (password.length < 6) return sendError(res, 400, "Password must contain at least 6 characters.");
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return sendError(res, 400, "Password confirmation does not match.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return sendError(res, 400, "Email format is invalid.");
  }
  if (users.some(u => u.email === normalizedEmail || u.username.toLowerCase() === normalizedUsername.toLowerCase())) {
    return sendError(res, 409, "Email or username is already registered.");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: nextUserId++, fullName: fullName.trim(), username: normalizedUsername, email: normalizedEmail, passwordHash };
  users.push(user);
  carts.set(user.id, []);
  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data: { id: user.id, fullName: user.fullName, username: user.username, email: user.email }
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return sendError(res, 400, "Email and password are required.");
  }
  const user = users.find(u => u.email === email.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return sendError(res, 401, "Email or password is incorrect.");
  }
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
  res.json({
    success: true,
    message: "Login successful.",
    data: { token, user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email } }
  });
});

// CART — requires Authorization: Bearer <token>
app.get("/api/cart", authRequired, (req, res) => {
  res.json({ success: true, data: cartDetails(Number(req.user.userId)) });
});

app.post("/api/cart/items", authRequired, (req, res) => {
  const { productId, size, quantity } = req.body || {};
  const id = Number(productId);
  const qty = quantity === undefined ? 1 : Number(quantity);
  const product = products.find(p => p.id === id);
  if (!Number.isInteger(id) || !product) return sendError(res, 404, "Product not found.");
  if (typeof size !== "string" || !product.sizes.includes(size)) {
    return sendError(res, 400, "A valid product size is required.");
  }
  if (!Number.isInteger(qty) || qty < 1) return sendError(res, 400, "Quantity must be a positive integer.");
  if (qty > product.stock) return sendError(res, 400, "Requested quantity exceeds available stock.");
  const cart = getCart(Number(req.user.userId));
  const existing = cart.find(item => item.productId === id && item.size === size);
  if (existing) {
    if (existing.quantity + qty > product.stock) return sendError(res, 400, "Requested quantity exceeds available stock.");
    existing.quantity += qty;
  } else {
    cart.push({ productId: id, size, quantity: qty });
  }
  res.status(201).json({ success: true, message: "Item added to cart.", data: cartDetails(Number(req.user.userId)) });
});

app.patch("/api/cart/items/:productId", authRequired, (req, res) => {
  const id = Number(req.params.productId);
  const { size, quantity } = req.body || {};
  if (!Number.isInteger(id)) return sendError(res, 400, "Product id must be an integer.");
  if (!Number.isInteger(quantity) || quantity < 1) return sendError(res, 400, "Quantity must be a positive integer.");
  const cart = getCart(Number(req.user.userId));
  const item = cart.find(i => i.productId === id && i.size === size);
  if (!item) return sendError(res, 404, "Cart item not found.");
  const product = products.find(p => p.id === id);
  if (quantity > product.stock) return sendError(res, 400, "Requested quantity exceeds available stock.");
  item.quantity = quantity;
  res.json({ success: true, message: "Cart item updated.", data: cartDetails(Number(req.user.userId)) });
});

app.delete("/api/cart/items/:productId", authRequired, (req, res) => {
  const id = Number(req.params.productId);
  const size = req.query.size;
  if (!Number.isInteger(id)) return sendError(res, 400, "Product id must be an integer.");
  const cart = getCart(Number(req.user.userId));
  const index = cart.findIndex(i => i.productId === id && i.size === size);
  if (index === -1) return sendError(res, 404, "Cart item not found.");
  cart.splice(index, 1);
  res.json({ success: true, message: "Cart item removed.", data: cartDetails(Number(req.user.userId)) });
});

// ORDERS
app.post("/api/orders", authRequired, (req, res) => {
  const { paymentMethod, paymentAccount, notes } = req.body || {};
  const userId = Number(req.user.userId);
  const summary = cartDetails(userId);
  if (!summary.items.length) return sendError(res, 400, "Cannot create an order with an empty cart.");
  if (typeof paymentMethod !== "string" || !paymentMethod.trim()) {
    return sendError(res, 400, "paymentMethod is required.");
  }
  if (typeof paymentAccount !== "string" || !paymentAccount.trim()) {
    return sendError(res, 400, "paymentAccount is required.");
  }
  const order = {
    id: nextOrderId++,
    userId,
    items: summary.items,
    subtotal: summary.subtotal,
    paymentMethod: paymentMethod.trim(),
    paymentAccount: paymentAccount.trim(),
    notes: typeof notes === "string" ? notes.trim() : "",
    status: "PENDING_PAYMENT",
    createdAt: new Date().toISOString()
  };
  orders.push(order);
  carts.set(userId, []);
  res.status(201).json({ success: true, message: "Order created.", data: order });
});

app.get("/api/orders", authRequired, (req, res) => {
  const ownOrders = orders.filter(order => order.userId === Number(req.user.userId));
  res.json({ success: true, data: ownOrders });
});

// PICKUPS
app.post("/api/pickups", authRequired, (req, res) => {
  const { orderId, name, date, time, notes } = req.body || {};
  if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Name is required.");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return sendError(res, 400, "Date must use YYYY-MM-DD format.");
  }
  const requestedDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(requestedDate.getTime()) || requestedDate < today) {
    return sendError(res, 400, "Pickup date cannot be earlier than today.");
  }
  if (!["10:00", "12:00", "14:00", "16:00"].includes(time)) {
    return sendError(res, 400, "Choose a valid pickup time: 10:00, 12:00, 14:00, or 16:00.");
  }
  const userId = Number(req.user.userId);
  if (orderId !== undefined) {
    const order = orders.find(o => o.id === Number(orderId) && o.userId === userId);
    if (!order) return sendError(res, 404, "Order not found for this account.");
  }
  const pickup = {
    id: nextPickupId++,
    userId,
    orderId: orderId === undefined ? null : Number(orderId),
    name: name.trim(),
    date,
    time,
    notes: typeof notes === "string" ? notes.trim() : "",
    status: "SCHEDULED",
    createdAt: new Date().toISOString()
  };
  pickups.push(pickup);
  res.status(201).json({ success: true, message: "Pickup scheduled successfully.", data: pickup });
});

app.get("/api/pickups", authRequired, (req, res) => {
  const ownPickups = pickups.filter(pickup => pickup.userId === Number(req.user.userId));
  res.json({ success: true, data: ownPickups });
});

// JSON 404 for unknown API routes
app.use("/api", (_req, res) => sendError(res, 404, "API endpoint not found."));

// Handle malformed JSON and unexpected errors without exposing stack traces.
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return sendError(res, 400, "Request body contains invalid JSON.");
  }
  console.error(err);
  return sendError(res, 500, "Internal server error.");
});

app.listen(PORT, () => {
  console.log(`CherrisBelle API listening on http://localhost:${PORT}`);
});
