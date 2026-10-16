\# ISAPCherrisBelle



\## Project Overview

ISAPCherrisBelle is a static website project containerized using Docker and Nginx.



\## Requirements

\- Docker Desktop



\## How to Run

1\. Clone this repository.

2\. Open a terminal in the project directory.

3\. Build the Docker image:



&#x20;  `docker build -t isapcherrisbelle:week6 .`



4\. Run the container:



&#x20;  `docker run -d --name isapcherrisbelle-app -p 8080:80 isapcherrisbelle:week6`



5\. Open http://localhost:8080 in your browser.



\## How to Stop



`docker stop isapcherrisbelle-app`



\## How to Remove the Container



`docker rm isapcherrisbelle-app`

