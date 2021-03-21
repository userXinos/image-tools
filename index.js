const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { getModule } = require('powercord/webpack');

const Settings = require('./components/Settings');
const patches = require('./patches');
const i18n = require('./i18n');

module.exports = class ImageTools extends Plugin {
  constructor () {
    super();
    this.uninjectIDs = [];
  }

  async startPlugin () {
    powercord.api.i18n.loadAllStrings(i18n);
    this.loadStylesheet('style.scss');
    this.registerSettings();

    await this.inject('TransitionGroup.default.prototype.render', patches.overlay);
    await this.inject('ImageModal.default.prototype.render', patches.imageModal);
    await this.inject('MessageContextMenu.default', patches.messageCM);
    await this.inject('GuildChannelUserContextMenu.default', patches.userCM);
    await this.inject('DMUserContextMenu.default', patches.userCM);
    await this.inject('UserGenericContextMenu.default', patches.userCM);
    await this.inject('GroupDMUserContextMenu.default', patches.userCM);
    await this.inject('GroupDMContextMenu.default', patches.groupDMCM);
    await this.inject('GuildContextMenu.default', patches.guildCM);
    await this.inject('NativeImageContextMenu.default', patches.imageCM);
  }

  pluginWillUnload () {
    this.uninjectIDs.forEach((id) => uninject(id));
    uninject('image-tools-overlay-image-modal');
    uninject('image-tools-overlay-backdrop');
    uninject('image-tools-wrapper-lazy-image');
    uninject('image-tools-disable-media-proxy-sizes');
    powercord.api.settings.unregisterSettings('image-tools-settings');
  }

  registerSettings () {
    powercord.api.settings.registerSettings('image-tools-settings', {
      category: this.entityID,
      label: 'Image Tools',
      render: Settings
    });
  }

  async inject (funcPath, patch) {
    const path = funcPath.split('.');
    const moduleName = path.shift();
    const injectFunc = path.pop();
    const injectId = `image-tools${moduleName.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`)}`;
    const module = getModule((m) => m.default && m.default.displayName === moduleName, false);
    const injectTo = getModulePath(); // eslint-disable-line no-use-before-define

    inject(injectId, injectTo, injectFunc, (...args) => patch(...args, this.settings));
    this.uninjectIDs.push(injectId);
    module.default.displayName = moduleName;

    function getModulePath () {
      let obj = module;
      if (path.length) {
        for (let i = 0, n = path.length; i < n; ++i) {
          const k = path[i];
          if (k in obj) {
            obj = obj[k];
          } else {
            throw new Error(`Not found ${path.join('.')}.${injectFunc} in ${moduleName}`);
          }
        }
      }
      return obj;
    }
  }
};
