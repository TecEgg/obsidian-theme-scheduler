# Obsidian Theme Scheduler Plugin

Automatically switches your Obsidian theme between light and dark modes based on the time of day. You can also select a community theme to be applied, while the plugin handles toggling its internal light/dark mode.

## Installation for Testing

Currently, this plugin is not yet published in the Community Plugins directory. To test and use it locally:

1. Locate your Obsidian vault folder on your computer.
2. Navigate to the hidden `.obsidian/plugins` directory inside your vault. (If it doesn't exist, create it).
3. Create a new folder named `theme-scheduler` inside the `plugins` folder.
4. Copy the following built files from this project into the new `theme-scheduler` folder:
   - `main.js`
   - `manifest.json`
5. Go to **Settings > Community Plugins** in Obsidian.
6. Disable "Safe mode" if it's currently enabled.
7. Click the **Reload plugins** button (refresh icon next to "Installed plugins").
8. Find **Theme Scheduler** in the list and toggle it **ON**.

## Usage

1. Go to **Settings > Theme Scheduler**.
2. Make sure the **Enabled** toggle is on.
3. Configure the **Light mode from** and **Dark mode from** times in `HH:MM` format (e.g., `07:00` and `21:00`).
4. (Optional) Toggle **Different times on weekends** if you want a separate schedule for Saturdays and Sundays, and set those times.
5. (Optional) Toggle **Show Status Bar** if you want to hide the light/dark mode indicator at the bottom.
6. (Optional) Select a specific community theme from the **Light community theme** and **Dark community theme** dropdowns. If left on "Do not change", the plugin will only switch the core Obsidian color mode (light/dark) without touching your active theme.
7. The plugin will check the time every minute and automatically switch the color mode if the configured times are crossed.
8. A brief notice popup will appear whenever the theme successfully switches.

## Commands

You can force the plugin to check and update the theme immediately by opening the Command Palette (`Ctrl/Cmd + P`) and running:
- **Theme Scheduler: Force check now**

## Development

If you want to modify the code:
1. Run `npm install` to install dependencies.
2. Run `npm run dev` to start compilation in watch mode.
3. You can set up a symbolic link or copy the compiled `main.js` and `manifest.json` into your vault to test your changes.
