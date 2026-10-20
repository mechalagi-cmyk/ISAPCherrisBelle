# ISAPCherrisBelle Website

## Project Description

ISAPCherrisBelle is a static website packaged using Docker and Nginx. Docker provides a consistent runtime environment, while Nginx serves the website files through a local web browser.

## Project Structure

```text
ISAPCherrisBelle/
├── Dockerfile
├── .dockerignore
├── README.md
└── [Website source files]
```

The website source files depend on the existing project structure and are copied into the Nginx web directory during the Docker image build.

## Prerequisites

- Docker Desktop installed and running.
- Git installed.
- A working Docker engine.
- The existing website source files in the project directory.

## Docker Configuration

The Dockerfile packages the existing website and uses Nginx to serve the static files.

The container listens on port `80`, which is mapped to port `8080` on the host machine.

## Build the Docker Image

Open a terminal in the project root directory and run:

```bash
docker build -t isapcherrisbelle:week6 .
```

Wait until the image build finishes successfully.

Verify that the image exists:

```bash
docker image ls
```

## Run the Application

Start the container with:

```bash
docker run -d --name isapcherrisbelle-app -p 8080:80 isapcherrisbelle:week6
```

## Access the Website

Open the following URL in your browser:

[http://localhost:8080/](http://localhost:8080/)

The website should appear if the container is running and the website files are configured correctly.

## Verification

### 1. Website Accessibility

Open `http://localhost:8080/` and confirm that the website loads correctly.

### 2. Container Status

Run:

```bash
docker ps
```

Check whether `isapcherrisbelle-app` is running.

### 3. Application Logs

Run:

```bash
docker logs isapcherrisbelle-app
```

Review the output for errors.

## View Live Logs

To follow the container logs continuously, run:

```bash
docker logs -f isapcherrisbelle-app
```

Press `Ctrl + C` to stop following the logs. This does not stop the container.

## Stop the Application

Stop the container with:

```bash
docker stop isapcherrisbelle-app
```

Remove the container with:

```bash
docker rm isapcherrisbelle-app
```

These commands do not delete the project source files or the Docker image.

## Troubleshooting

### Website Cannot Be Opened

- Confirm that Docker Desktop is running.
- Check the container status using `docker ps -a`.
- Review the container logs using `docker logs isapcherrisbelle-app`.
- Confirm that port `8080` is not being used by another application.

### Docker Build Fails

- Confirm that the `Dockerfile` exists in the project root.
- Confirm that the website source files are included in the build context.
- Check the first error message displayed during the build.

### Website Files Are Missing

- Confirm that the required HTML, CSS, JavaScript, and image files are present.
- Check that the Dockerfile copies the website files to the correct Nginx web directory, usually `/usr/share/nginx/html`.

### Container Does Not Start

- Run `docker ps -a` to inspect the container status.
- Run `docker logs isapcherrisbelle-app` to identify possible errors.
- Check whether the container name or host port is already in use.

## Notes

- The existing website source code is used without adding new application features.
- Docker and Nginx are used to package and serve the website.
- Successful image building, container execution, and website verification must be confirmed before claiming the deployment is complete.
