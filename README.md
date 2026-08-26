# Paper Lab

Welcome to the public repository for **Paper Lab**! 

This repository serves two primary purposes:
1. **Public Releases & Updates:** It acts as the official download hub and OTA (Over-The-Air) update server for the Paper Lab desktop application.
2. **Website Source Code:** It contains the source code for the official Paper Lab landing page and website.

*(Note: The core proprietary source code for the Paper Lab application is kept in a separate, private repository.)*

---

## 📥 Download Paper Lab

You can always download the latest version of Paper Lab for Windows from our official Releases page.

**[👉 Download the latest `.msi` installer here](https://github.com/Sree14hari/PaperLab/releases/latest)**

*(If Windows SmartScreen warns you about an "Unknown Publisher", this is expected as the installer is not yet signed with an EV certificate. Simply click "More info" -> "Run anyway" to install.)*

---

## 🌐 Website & Landing Page

The website is built with [Astro](https://astro.build) and [TailwindCSS](https://tailwindcss.com), and is automatically deployed to Vercel. 

### Running the website locally

To run the landing page on your own machine:

1. Clone this repository:
   ```bash
   git clone https://github.com/Sree14hari/PaperLab.git
   cd PaperLab
   ```

2. Install dependencies (we recommend `bun` or `npm`):
   ```bash
   bun install
   # or npm install
   ```

3. Start the development server:
   ```bash
   bun run dev
   # or npm run dev
   ```

4. Open your browser and navigate to `http://localhost:4321`.

---

## ⚙️ Updating the App (For Developers)

To publish a new version of Paper Lab:
1. Compile the new `.msi` installer using `tauri build`.
2. Create a new GitHub Release on this repository and upload the `.msi` file to the release assets.
3. Update `public/latest.json` with the new version number, release notes, signature, and the **new GitHub Release direct download URL**.
4. Push the changes to update the update server. The desktop app will automatically detect and download the update.
