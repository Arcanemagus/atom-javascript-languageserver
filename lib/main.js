const cp = require('child_process')
const path = require('path')
const {AutoLanguageClient} = require('atom-languageclient')

class JavaScriptLanguageServer extends AutoLanguageClient {
  getGrammarScopes () { return [ 'source.javascript' ] }
  getLanguageName () { return 'JavaScript' }
  getServerName () { return 'AtomJS' }

  startServerProcess () {
    const command = node
    const args = [ path.join(__dirname, 'server') ]
    this.logger.debug(`starting "${command} ${args.join(' ')}"`)
    return cp.spawn(command, args)
  }
}

module.exports = new JavascriptLanguageServer()
