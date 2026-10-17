# Cloud Deployment Guide — Resonance Studio Booth

Deploy the **Studio Booth** to a free cloud hosting provider so anyone can access it 24/7 from anywhere in the world without keeping your computer on.

---

## ⭐️ Method 1: Hugging Face Spaces (Recommended)

**Why HF Spaces:**
- **100% Free** (permanent, no credit card required)
- **Built-in HTTPS** (microphone permissions work flawlessly on iOS Safari & Android Chrome)
- **Zero Sleep** on free CPU tier (does not go to sleep after 15 minutes like Render)
- **Permanent URL:** `https://<username>-resonance-studio-booth.hf.space`

### Steps to Deploy (Takes ~3 minutes):

1. **Create a Free Account** at [huggingface.co](https://huggingface.co/join) (if you don't already have one).
2. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
   - **Space Name:** `resonance-studio-booth` (or any name you like)
   - **License:** `mit` or `apache-2.0`
   - **Select the Space SDK:** Choose **Docker** -> **Blank**
   - **Space Hardware:** Free (CPU basic · 2 vCPU · 16 GB RAM)
   - Click **Create Space**
3. **Push the code from your computer:**
   Open PowerShell in the `collector` directory:
   ```powershell
   cd n:\Projects\nndlnew\collector
   git init
   git remote add space https://huggingface.co/spaces/<YOUR_USERNAME>/resonance-studio-booth
   git add .
   git commit -m "Deploy Studio Booth"
   git push -u space main --force
   ```
   *(When prompted for password, enter your Hugging Face Access Token with "write" permissions from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens))*.

4. Hugging Face will automatically build the Docker container and make the site live in ~2 minutes!
5. **Share the link:** Send `https://<YOUR_USERNAME>-resonance-studio-booth.hf.space` to your participants.

---

## ⭐️ Method 2: Render.com

**Why Render:**
- Direct GitHub repository integration (auto-deploys on `git push`)
- Free web service tier

### Steps to Deploy:

1. **Push your project to GitHub:**
   - Create a GitHub repository (e.g. `nndl-resonance`).
   - Push your code to GitHub.
2. **Create a Web Service on Render:**
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - **Root Directory:** `collector`
   - **Runtime:** `Docker`
   - **Plan:** Free
   - Click **Create Web Service**.
3. Render will build the Docker container and give you a public URL like:
   `https://resonance-studio-booth.onrender.com`

---

## 📥 How to Download Your Collected Dataset

Once participants record their emotions and you are ready to use the data:

Simply visit the export URL in your browser:
```text
https://<YOUR_APP_URL>/api/export
```
*(Example: `https://yourname-resonance-studio-booth.hf.space/api/export`)*

This instantly downloads a clean **`resonance_dataset.zip`** containing:
- `metadata.csv` (all annotations, self-reported emotions, intensity scores, and valence-arousal values)
- `audio/` (all 16kHz mono WAV recordings)

Extract the zip into your project's `collector/dataset/` folder and you're ready to train!
