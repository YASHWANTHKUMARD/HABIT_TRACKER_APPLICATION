# 🚀 Habit Tracker

A modern, scalable Full-Stack Habit Tracker application. Built with a unified Microservices Architecture to track daily disciplines, habits, and consistency scores across a calendar year. 

This application has been purposely containerized using **Docker** and orchestrated for high availability using **Kubernetes**.

---

## 🛠️ Architecture Overview

The system is fully decoupled into a **Microservices Architecture**, divided into three distinct operational tiers:

1. **Frontend Presentation Service (React + Vite)**
   - Responsible strictly for user interface rendering and REST API communications.
   - Built to production standard via multi-stage `Dockerfile` and served by an `Nginx` container.
   - Designed to run multiple, highly-available replicas.
   
2. **Backend Logic Service (Node.js + Express API)**
   - REST API handling the transport of logic, acting as the bridge between the UI and data storage.
   - Provides stateless HTTP endpoints capable of scaling dynamically under network load.

3. **Stateful Database Service (PostgreSQL)**
   - Handles all persistent data memory.
   - Employs a Kubernetes `PersistentVolume` (PV) and `PersistentVolumeClaim` (PVC) to guarantee that habit data is safely stored directly onto the host hard drive, preventing data loss even if the container crashes.

---

## 💻 Tech Stack

- **Frontend:** React, HTML5, Vanilla CSS, Vite, Nginx
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **DevOps & Infrastructure:** Docker, Kubernetes (`kubectl`)

---

## 🚀 Running the Application Locally (Kubernetes)

To run this application, ensure you have **Docker Desktop** installed with the internal **Kubernetes** server enabled in your settings. 

### 1. Build the Docker Images
You must package the frontend and backend microservices into containers before Kubernetes can deploy them.
Run these commands from the root directory:

```bash
# Build the Frontend Image
docker build -t habit-tracker-frontend:latest .

# Build the Backend Image
docker build -t habit-tracker-backend:latest ./backend
```

### 2. Deploy the Cluster
Inject the deployment blueprints into your local Kubernetes engine:

```bash
kubectl apply -f k8s/
```

### 3. Verify and Access
Watch the pods boot up until their status becomes `Running`:
```bash
kubectl get pods -w
```

Once running, access the web interface your browser at: 
👉 **[http://localhost:30005](http://localhost:30005)**

---

## 🏗️ Kubernetes Objects Used

- **Deployments:** Controls the Pod Replicas for `frontend` and `backend` to ensure High Availability and auto-healing in case of fatal container failures.
- **Services:** Acts as static traffic-cops/load-balancers. 
  - `NodePort 30005` routes external browser traffic to the Frontend.
  - `NodePort 30006` routes internal Frontend container requests to the Backend API.
- **Persistent Volume Claims (PVC):** Allocates hard drive space outside of the Docker container lifecycle, ensuring permanent persistence of user habit tracking history despite potential database Pod crashes.
