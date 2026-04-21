import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';

interface ThemeSchedulerSettings {
  enabled: boolean;
  showStatusBar: boolean;
  lightFrom: string;    // "HH:MM"
  darkFrom: string;     // "HH:MM"
  useWeekendTimes: boolean;
  weekendLightFrom: string;
  weekendDarkFrom: string;
  lightTheme: string;
  darkTheme: string;
}

const DEFAULT_SETTINGS: ThemeSchedulerSettings = {
  enabled: true,
  showStatusBar: true,
  lightFrom: '07:00',
  darkFrom: '21:00',
  useWeekendTimes: false,
  weekendLightFrom: '09:00',
  weekendDarkFrom: '23:00',
  lightTheme: '',
  darkTheme: '',
};

function isInLightMode(lightFrom: string, darkFrom: string): boolean {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();

  let lh = 7, lm = 0;
  if (lightFrom.includes(':')) {
    const parts = lightFrom.split(':').map(Number);
    lh = parts[0] ?? 7;
    lm = parts[1] ?? 0;
  }
  let dh = 21, dm = 0;
  if (darkFrom.includes(':')) {
    const parts = darkFrom.split(':').map(Number);
    dh = parts[0] ?? 21;
    dm = parts[1] ?? 0;
  }
  
  const light = lh * 60 + lm;
  const dark  = dh * 60 + dm;

  if (light < dark) {
    return current >= light && current < dark;
  } else {
    return current >= light || current < dark;
  }
}

export default class ThemeSchedulerPlugin extends Plugin {
  settings: ThemeSchedulerSettings;
  statusBarItemEl: HTMLElement;
  lastMode: 'light' | 'dark' | null = null;

  async onload() {
    await this.loadSettings();

    // Status bar
    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar();

    // Command
    this.addCommand({
      id: 'force-check',
      name: 'Force check now',
      callback: () => {
        this.checkAndSwitchTheme(true);
      }
    });

    // Settings Tab
    this.addSettingTab(new ThemeSchedulerSettingTab(this.app, this));

    // Initial check
    this.checkAndSwitchTheme(true);

    // Interval
    this.registerInterval(
      window.setInterval(() => this.checkAndSwitchTheme(), 60 * 1000)
    );
  }

  onunload() {
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.checkAndSwitchTheme(true); // Re-check when settings change
  }

  checkAndSwitchTheme(force = false) {
    if (!this.settings.enabled) {
      this.updateStatusBar('disabled');
      return;
    }

    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    const lightTime = (isWeekend && this.settings.useWeekendTimes) ? this.settings.weekendLightFrom : this.settings.lightFrom;
    const darkTime = (isWeekend && this.settings.useWeekendTimes) ? this.settings.weekendDarkFrom : this.settings.darkFrom;

    const isLight = isInLightMode(lightTime, darkTime);
    const targetMode = isLight ? 'light' : 'dark';

    this.updateStatusBar(targetMode);

    if (!force && this.lastMode === targetMode) {
      return; // Already in correct mode and we already set it
    }

    // Notice on switch
    if (this.lastMode !== null && this.lastMode !== targetMode) {
      if (isLight) {
        new Notice('🌞 Switching to light mode');
      } else {
        new Notice('🌙 Switching to dark mode');
      }
    }

    this.lastMode = targetMode;

    const desiredModeName = isLight ? 'moonstone' : 'obsidian';
    
    // 1. Update Color Mode robustly
    if (typeof (this.app as any).changeTheme === 'function') {
      (this.app as any).changeTheme(desiredModeName);
    } else if (typeof (this.app as any).setTheme === 'function') {
      (this.app as any).setTheme(desiredModeName);
    }
    
    (this.app.vault as any).setConfig('theme', desiredModeName);
    this.app.workspace.trigger('css-change');

    // 2. Update Community Theme (optional)
    const desiredCommunityTheme = isLight ? this.settings.lightTheme : this.settings.darkTheme;
    const currentCssTheme = (this.app as any).customCss?.theme ?? '';

    if (desiredCommunityTheme && desiredCommunityTheme !== currentCssTheme) {
      (this.app as any).customCss?.setTheme(desiredCommunityTheme);
    } else if (currentCssTheme) {
      // Re-apply to ensure proper rendering after base mode change
      (this.app as any).customCss?.setTheme(currentCssTheme);
    }

    // 3. Trigger reload
    (this.app as any).customCss?.requestLoadTheme?.();
  }

  updateStatusBar(mode?: 'light' | 'dark' | 'disabled') {
    if (!this.settings.showStatusBar) {
      this.statusBarItemEl.hide();
      return;
    } else {
      this.statusBarItemEl.show();
    }

    if (!this.settings.enabled || mode === 'disabled') {
      this.statusBarItemEl.setText('⏳ Theme: Disabled');
      return;
    }
    
    if (mode === 'light') {
      this.statusBarItemEl.setText('🌞 Light Mode');
    } else if (mode === 'dark') {
      this.statusBarItemEl.setText('🌙 Dark Mode');
    } else {
      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      const lightTime = (isWeekend && this.settings.useWeekendTimes) ? this.settings.weekendLightFrom : this.settings.lightFrom;
      const darkTime = (isWeekend && this.settings.useWeekendTimes) ? this.settings.weekendDarkFrom : this.settings.darkFrom;
      
      const isLight = isInLightMode(lightTime, darkTime);
      this.statusBarItemEl.setText(isLight ? '🌞 Light Mode' : '🌙 Dark Mode');
    }
  }
}

class ThemeSchedulerSettingTab extends PluginSettingTab {
  plugin: ThemeSchedulerPlugin;

  constructor(app: App, plugin: ThemeSchedulerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Theme Scheduler' });

    new Setting(containerEl)
      .setName('Enabled')
      .setDesc('Automatically switch theme based on time')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Show Status Bar')
      .setDesc('Show the current mode indicator in the status bar')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showStatusBar)
        .onChange(async (value) => {
          this.plugin.settings.showStatusBar = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Light mode from')
      .setDesc('Switch to light mode at this time (HH:MM)')
      .addText(text => text
        .setPlaceholder('07:00')
        .setValue(this.plugin.settings.lightFrom)
        .onChange(async (value) => {
          this.plugin.settings.lightFrom = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Dark mode from')
      .setDesc('Switch to dark mode at this time (HH:MM)')
      .addText(text => text
        .setPlaceholder('21:00')
        .setValue(this.plugin.settings.darkFrom)
        .onChange(async (value) => {
          this.plugin.settings.darkFrom = value;
          await this.plugin.saveSettings();
        }));

    // Weekend Overrides
    new Setting(containerEl)
      .setName('Different times on weekends')
      .setDesc('Use custom light/dark times for Saturday and Sunday')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useWeekendTimes)
        .onChange(async (value) => {
          this.plugin.settings.useWeekendTimes = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide weekend inputs
        }));

    if (this.plugin.settings.useWeekendTimes) {
      new Setting(containerEl)
        .setName('Weekend light from')
        .setDesc('Switch to light mode on weekends at this time (HH:MM)')
        .addText(text => text
          .setPlaceholder('09:00')
          .setValue(this.plugin.settings.weekendLightFrom)
          .onChange(async (value) => {
            this.plugin.settings.weekendLightFrom = value;
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
        .setName('Weekend dark from')
        .setDesc('Switch to dark mode on weekends at this time (HH:MM)')
        .addText(text => text
          .setPlaceholder('23:00')
          .setValue(this.plugin.settings.weekendDarkFrom)
          .onChange(async (value) => {
            this.plugin.settings.weekendDarkFrom = value;
            await this.plugin.saveSettings();
          }));
    }

    // Community Theme Selection
    const themes = Object.keys((this.app as any).customCss?.themes || {});
    const themeOptions: Record<string, string> = { '': 'Do not change community theme' };
    themes.forEach(t => {
      themeOptions[t] = t;
    });

    new Setting(containerEl)
      .setName('Light community theme')
      .setDesc('Optional: Specific community theme to apply during light mode')
      .addDropdown(dropdown => dropdown
        .addOptions(themeOptions)
        .setValue(this.plugin.settings.lightTheme)
        .onChange(async (value) => {
          this.plugin.settings.lightTheme = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Dark community theme')
      .setDesc('Optional: Specific community theme to apply during dark mode')
      .addDropdown(dropdown => dropdown
        .addOptions(themeOptions)
        .setValue(this.plugin.settings.darkTheme)
        .onChange(async (value) => {
          this.plugin.settings.darkTheme = value;
          await this.plugin.saveSettings();
        }));
  }
}
