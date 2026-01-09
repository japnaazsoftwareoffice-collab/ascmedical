# How to Deploy to Hostinger

Since you are using a **Vite + React** project, you need to "build" the project first, which creates a `dist` folder containing static files (HTML, CSS, JS). These are the only files you need to upload to your hosting provider.

## Step 1: Build the Project (Already Completed)
I have already run the build command for you.
- **Output Folder**: `e:\medicalAI\ascmedical\dist`
- **Contents**: You will see an `index.html` file and an `assets` folder inside.

## Step 2: Access Hostinger File Manager
1. Go to your Hostinger dashboard (as seen in your screenshot).
2. Click on the **Websites** tab on the left.
3. Find `asc-manager.japnaazsoftware.com` and click **Manage**.
4. Look for **File Manager** (usually under a "Files" section) and click it.

## Step 3: Upload Files
1. In the File Manager, navigate to the **public_html** folder.
   - *Note*: Since this is a subdomain, it might be inside a folder named `asc-manager` or something similar inside the main domain's `public_html`, OR it might have its own root folder. Look for the folder that corresponds to `asc-manager.japnaazsoftware.com`.
2. **Delete** any default files (like `default.php` or `index.php`) if they exist.
3. **Upload** the contents of your local `dist` folder.
   - **Important**: Do NOT upload the `dist` folder itself. Open the `dist` folder on your computer, select all files (`index.html`, `assets` folder, etc.), and upload *those* directly.
   - You should see `index.html` sitting directly inside your `public_html` (or subdomain folder).

## Step 4: Fix Routing (Important for React Apps)
Since this is a Single Page Application (SPA), navigating to a sub-page (like `/dashboard`) and refreshing the browser might cause a "404 Not Found" error because the server is looking for a real file named "dashboard". You need to tell Hostinger to redirect all requests to `index.html`.

1. In the same folder where you uploaded `index.html`, look for a `.htaccess` file.
2. If it exists, edit it. If not, create a new file named `.htaccess`.
3. Paste the following code into `.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```
4. Save the file.

## Step 5: Test
1. Open `http://asc-manager.japnaazsoftware.com` in your browser.
2. You should see your application running!
