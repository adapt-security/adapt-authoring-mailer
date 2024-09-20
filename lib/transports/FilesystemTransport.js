import AbstractMailTransport from '../AbstractMailTransport.js'
import { App } from 'adapt-authoring-core'
import fs from 'fs/promises'
import path from 'path'
/**
 * Local filesystem shim mail transport, will store mail data locally
 * @memberof mailer
 * @extends {AbstractMailTransport}
 */
class FilesystemTransport extends AbstractMailTransport {
  name = 'filesystem'
  
  /**
   * Returns the mail output directory
   * @returns {string}
   */
  get outputDir () {
    return path.join(App.instance.getConfig('tempDir'), 'mailer')
  }

  /** @override */
  async send (data) {
    return fs.writeFile(path.join(this.outputDir, `${new Date().toISOString()}.txt`), JSON.stringify(data, null, 2))
  }

  /** @override */
  async test () {
    try {
      await fs.mkdir(this.outputDir)
    } catch (e) {
      if(e.code !== 'EEXIST') throw e
    }
    await fs.readdir(this.outputDir);
  }
}

export default FilesystemTransport
