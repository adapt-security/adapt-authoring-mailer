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
  
  /** @override */
  async send (data) {
    const dir = path.join(App.instance.getConfig('tempDir'), 'mailer')
    try {
      await fs.mkdir(dir)
    } catch {}
    return fs.writeFile(path.join(dir, `${Date.now()}.txt`), JSON.stringify(data, null, 2))
  }
}

export default FilesystemTransport
