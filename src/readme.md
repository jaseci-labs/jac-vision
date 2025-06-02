# FastAPI Backend Setup on RunPod

This guide will walk you through setting up and running your FastAPI backend on a RunPod instance and linking it with your frontend.

---

## Step 1: Create a Pod on RunPod

1. Go to [RunPod.io](https://www.runpod.io/).
2. Log in and click on **"Pods"** in the left sidebar.
3. Click the **"Deploy"** button, set a pod name, and then click on **"Deploy - On Demand"**.
4. After the pod starts:
   - Click the **Stop** button (left side of the pod) to access more options.
   - Click **Edit Pod** to modify the disk size and other settings.
   - (Optional) Attach a volume for persistent storage.
   - Under **Expose HTTP Ports**, add port `8000` (or whichever port your FastAPI app uses).
5. Save the pod and wait for it to be ready.

![image](https://github.com/user-attachments/assets/964945d2-15e5-49e8-8787-cf4498709443)
![image](https://github.com/user-attachments/assets/55ebe5db-d7a2-4d5a-8642-6ddb6d1e9af7)

---

## Step 2: Open Pod Terminal

Once the pod is running:

1. Click the **Connect** button on the pod dashboard.
2. This will open the pod terminal where you can run shell commands.

---

## Step 3: Clone the Backend Repository

Inside the pod terminal:

```bash
git clone <your-repo-url>
cd <your-repo-folder>/src/backend
```

Replace `<your-repo-url>` and `<your-repo-folder>` with your actual GitHub repository URL and folder name.

---

## Step 4: Create and Activate a Virtual Environment

Create and activate a virtual environment to manage dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## Step 5: Install Project Dependencies

With the virtual environment activated, install the required packages using:

```bash
pip install -r requirements_with_versions.txt
```


## Step 6: Run the FastAPI Server

Launch your FastAPI backend using `uvicorn`:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Step 7: Connect Backend to Frontend (Deployed on Vercel)

1. Once the FastAPI server is running, copy the public endpoint from RunPod (e.g., `https://xxxxxx.r.runpod.io`).
2. Update the backend URL in the frontend project:
   - Modify the endpoint inside the files:
     - `src/frontend/utils/api.ts`
     - `src/frontend/utils/image_Captioning_api.ts`
   - Replace any existing API base URLs with your new RunPod endpoint (including the correct port and path if needed).
3. Commit and push the changes to your repository:

```bash
git add .
git commit -m "Updated backend URLs to RunPod endpoint"
git push origin main
```

Then you can use deployed version of `https://jac-vision.vercel.app/`


---

## 🔁 Note: Stopping the Pod

Whenever you need to stop the pod, simply click the **"Stop"** button next to your pod on the RunPod dashboard.

This will safely shut down your backend and free up resources.

