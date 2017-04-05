import {createConnection} from 'vscode-languageserver'
import {CLIEngine} from 'eslint'

const connection = createConnection()
console.log = connection.console.log.bind(connection.console)
console.error = connection.console.error.bind(connection.console)

let cli = new CLIEngine() // TODO: Refresh this on .eslint etc. file change??

connection.onInitialize(params => {
  if (params.rootPath || params.rootUri) {
    const cwd = params.rootPath || uriToPath(params.rootUri);
    cli = new CLIEngine({cwd: cwd})
  }
  return {
    capabilities: {
      textDocumentSync: 1 // Full text
    }
  }
})

connection.onDidOpenTextDocument(params => {
  if (params.textDocument) {
    diagnoseText(params.textDocument.uri, params.textDocument.text)
  }
})

connection.onDidChangeTextDocument(change => {
  diagnoseText(change.textDocument.uri, change.contentChanges[0].text)
})

function diagnoseText (uri, text) {
  const report = cli.executeOnText(text)
  if (report == null || report.results == null || report.results.length !== 1) {
    clearDiagnostics(uri)
  } else {
    const diagnostics = report.results[0].messages.map(linterMessageToDiagnostic)
    connection.sendDiagnostics({uri: uri, diagnostics: diagnostics})
  };
}

function clearDiagnostics (uri) {
  connection.sendDiagnostics(uri, [])
}

function linterMessageToDiagnostic (lint) {
  const start = toPosition(lint.line - 1, lint.column - 1)
  const end = calculateEnd(start, lint)
  return {
    range: { start: start, end: end },
    severity: toDiagnosticSeverity(lint.severity),
    code: lint.ruleId,
    message: lint.message
  }
};

function calculateEnd (start, lint) {
  if (lint.fix != null) {
    const rangeLength = lint.fix.range[1] - lint.fix.range[0]
    return toPosition(start.line, start.character + rangeLength)
  } else {
    return toPosition(start.line, start.character + 5) // TODO: Some kind of word-based fallback?
  }
}

function toPosition (line, column) {
  return { line: line, character: column }
}

function toDiagnosticSeverity (lintSeverity) {
  switch (lintSeverity) {
    case 1: return 2  // Warning
    case 2: return 1  // Error
    default: return 3 // Information for now
  }
};

function uriToPath (uri) {
  uri = decodeURIComponent(uri)
  if (uri.startsWith('file://')) uri = uri.substr(7)
  if (process.platform === 'win32') {
    if (uri[0] === '/') {
      uri = uri.substr(1)
    }
    return uri.replace(/\//g, '\\')
  }
  return uri
}

connection.listen()
