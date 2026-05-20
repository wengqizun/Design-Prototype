import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'

const stripAnsi = (value) => value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
const resolvePath = (value) => path.resolve(process.cwd(), value)
const OPENAPI_DEFAULT_PORT = 9910

const usage = [
  '用法：node dev.mjs --container-dir <dir> --prototype-dir <dir> [--openapi-dir <dir>]',
  '示例：node dev.mjs --container-dir PrototypeContainer --prototype-dir Prototype --openapi-dir OpenAPI',
].join('\n')

const readOptionValue = (args, index, optionName) => {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) {
    throw new Error(`缺少 ${optionName} 参数值\n${usage}`)
  }
  return value
}

const parseArgs = (args) => {
  const options = {
    containerDir: process.env.CONTAINER_DIR,
    prototypeDir: process.env.PROTOTYPE_DIR,
    openapiDir: process.env.OPENAPI_DIR,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--container-dir' || arg === '-c') {
      options.containerDir = readOptionValue(args, index, '--container-dir')
      index += 1
      continue
    }

    if (arg.startsWith('--container-dir=')) {
      options.containerDir = arg.slice('--container-dir='.length)
      continue
    }

    if (arg === '--prototype-dir' || arg === '-p') {
      options.prototypeDir = readOptionValue(args, index, '--prototype-dir')
      index += 1
      continue
    }

    if (arg.startsWith('--prototype-dir=')) {
      options.prototypeDir = arg.slice('--prototype-dir='.length)
      continue
    }

    if (arg === '--openapi-dir') {
      options.openapiDir = readOptionValue(args, index, '--openapi-dir')
      index += 1
      continue
    }

    if (arg.startsWith('--openapi-dir=')) {
      options.openapiDir = arg.slice('--openapi-dir='.length)
      continue
    }

    throw new Error(`未知参数：${arg}\n${usage}`)
  }

  if (!options.containerDir || !options.prototypeDir) {
    throw new Error(`请同时指定容器项目目录和原型项目目录\n${usage}`)
  }

  const containerDir = resolvePath(options.containerDir)
  const prototypeDir = resolvePath(options.prototypeDir)
  const openapiDir = options.openapiDir ? resolvePath(options.openapiDir) : undefined

  if (!existsSync(path.join(containerDir, 'package.json'))) {
    throw new Error(`容器项目目录无效，未找到 package.json：${containerDir}`)
  }

  if (!existsSync(path.join(prototypeDir, 'package.json'))) {
    throw new Error(`原型项目目录无效，未找到 package.json：${prototypeDir}`)
  }

  if (openapiDir && (!existsSync(openapiDir) || !statSync(openapiDir).isDirectory())) {
    throw new Error(`OpenAPI 目录无效：${openapiDir}`)
  }

  return {
    containerDir,
    prototypeDir,
    openapiDir,
  }
}

const children = []

let shuttingDown = false

const shutdown = (code = 0) => {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  process.exit(code)
}

const watchChildExit = (child) => {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code || 1)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

const isPortAvailable = (port) => new Promise((resolve) => {
  const server = net.createServer()

  server.once('error', () => resolve(false))
  server.once('listening', () => {
    server.close(() => resolve(true))
  })

  server.listen(port)
})

const findAvailablePort = async (startPort) => {
  let port = startPort

  while (!(await isPortAvailable(port))) {
    port += 1
  }

  return port
}

const startPrototype = (prototypeDir) => new Promise((resolve, reject) => {
  const child = spawn('npm', ['--prefix', prototypeDir, 'run', 'dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  children.push(child)
  watchChildExit(child)

  let settled = false
  let output = ''

  const handleOutput = (chunk, stream) => {
    stream.write(chunk)

    if (settled) return

    output += stripAnsi(chunk.toString())
    const match = output.match(/http:\/\/localhost:(\d+)/)

    if (match) {
      settled = true
      resolve(`http://localhost:${match[1]}`)
    }
  }

  child.stdout.on('data', (chunk) => handleOutput(chunk, process.stdout))
  child.stderr.on('data', (chunk) => handleOutput(chunk, process.stderr))

  child.once('error', reject)
  child.once('exit', (code) => {
    if (!settled) {
      reject(new Error(`原型项目启动失败，退出码：${code ?? 1}`))
    }
  })
})

const startOpenApi = async (openapiDir) => {
  const port = await findAvailablePort(OPENAPI_DEFAULT_PORT)
  const child = spawn('npx', ['@redocly/cli', 'preview', '-p', String(port)], {
    cwd: openapiDir,
    stdio: 'inherit',
  })

  children.push(child)
  watchChildExit(child)
  child.once('error', (error) => {
    console.error(error)
    shutdown(1)
  })

  console.log(`OpenAPI preview: http://localhost:${port}`)
}

const startContainer = ({ containerDir, prototypeOrigin, prototypePagesDir }) => {
  const child = spawn('npm', ['--prefix', containerDir, 'run', 'dev'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_PROTOTYPE_ORIGIN: prototypeOrigin,
      PROTOTYPE_PAGES_DIR: prototypePagesDir,
    },
  })

  children.push(child)
  watchChildExit(child)
}

try {
  const { containerDir, prototypeDir, openapiDir } = parseArgs(process.argv.slice(2))
  const prototypePagesDir = path.join(prototypeDir, 'src/pages')
  if (openapiDir) {
    await startOpenApi(openapiDir)
  }
  const prototypeOrigin = await startPrototype(prototypeDir)
  startContainer({ containerDir, prototypeOrigin, prototypePagesDir })
} catch (error) {
  console.error(error)
  shutdown(1)
}
