# Backend Deployment Guide - Render

## Quick Deploy (1 Click)

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Select **"Deploy an existing project from a Git repository"**
   - Paste: `https://github.com/YOUR_USERNAME/fam-bottling-backend.git`
   - Or if no GitHub: Click **"Public Git repository"** and paste the above
4. Configure settings:
   - **Name**: `fam-bottling-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)

5. **Add Environment Variables** (critical):
   ```
   MONGODB_URI = mongodb+srv://Yahaya_my:Rkqjy306ckl42TBa@cluster0.vxog1iu.mongodb.net/?appName=Cluster0.database1
   JWT_SECRET = test_secret_key_for_local_development_12345
   PORT = 5000
   NODE_ENV = production
   TIMELESS_EMAIL = timelessbyemjay@gmail.com
   ```

6. Click **"Create Web Service"**
7. Wait 2-3 minutes for deployment
8. Copy the URL (looks like: `https://fam-bottling-backend.onrender.com`)

## Manual Deploy

If you already have a GitHub repo:

```bash
git push origin main
```

Then follow steps 1-8 above with your repo URL.

## Using the Deployed Backend

Your frontend should use:
```
VITE_API_BASE_URL=https://fam-bottling-backend.onrender.com/api
```

Test the health endpoint:
```bash
curl https://fam-bottling-backend.onrender.com/api/health
```

Expected response:
```json
{"status":"Backend is running!"}
```

## Admin Login

Use these credentials after deployment:
- Email: `admin@fambottling.com`
- Password: `Admin@123456`

## Notes

- Free tier on Render spins down after 15 min of inactivity
- For production, upgrade to a paid plan
- All data is stored in MongoDB Atlas (no worries about data loss)
