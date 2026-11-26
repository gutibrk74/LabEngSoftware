// Testes unitários sem dependências novas: usa TypeScript já instalado pelo projeto.
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

const temporario = mkdtempSync(join(tmpdir(), 'reserva-sessao-'));
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'),
    '--target', 'es2022', '--module', 'commonjs', '--lib', 'es2022,dom',
    '--strict', '--skipLibCheck', '--outDir', temporario,
    'src/services/sessao.ts', 'src/services/renovacaoSessao.ts'], { stdio: 'inherit' });
} catch (erro) {
  rmSync(temporario, { recursive: true, force: true });
  throw erro;
}
after(() => rmSync(temporario, { recursive: true, force: true }));
const { mesmaSessao, salvarToken, obterToken, encerrarSessaoExpirada } = require(join(temporario, 'sessao.js'));
const { deveRenovar, comBloqueioRenovacao } = require(join(temporario, 'renovacaoSessao.js'));
const agora = 1_800_000_000_000;
const jwt = (sid, exp, sub = '1', jti = 'a') =>
  `header.${Buffer.from(JSON.stringify({ sid, exp: exp / 1000, sub, jti })).toString('base64url')}.signature`;
let eventos;
beforeEach(() => {
  const storage = new Map();
  eventos = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }});
  globalThis.window = { dispatchEvent: (evento) => eventos.push(evento.type) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
});

test('renova só na janela, com atividade recente e aba visível', () => {
  const perto = jwt('sessao', agora + 240_000);
  assert.equal(deveRenovar(perto, agora - 1000, agora, true), true);
  assert.equal(deveRenovar(perto, agora - 300_000, agora, true), false);
  assert.equal(deveRenovar(perto, agora - 1000, agora, false), false);
  assert.equal(deveRenovar(jwt('sessao', agora + 360_000), agora, agora, true), false);
  assert.equal(deveRenovar(jwt('sessao', agora), agora, agora, true), false);
  assert.equal(deveRenovar('invalido', agora, agora, true), false);
});

test('distingue renovação de um novo login da mesma conta', () => {
  const anterior = jwt('a', agora + 1000);
  assert.equal(mesmaSessao(anterior, jwt('a', agora + 5000, '1', 'b')), true);
  assert.equal(mesmaSessao(anterior, jwt('b', agora + 5000)), false);
  assert.equal(mesmaSessao(anterior, jwt('a', agora + 5000, '2')), false);
  assert.equal(mesmaSessao(anterior, null), false);
});

test('401/expiração do token anterior não remove token novo', () => {
  const anterior = jwt('a', agora + 1000);
  const novo = jwt('b', agora + 5000);
  salvarToken(novo);
  encerrarSessaoExpirada(anterior);
  assert.equal(obterToken(), novo);
  assert.deepEqual(eventos, []);
  encerrarSessaoExpirada(novo);
  assert.equal(obterToken(), null);
  assert.deepEqual(eventos, ['sessao-expirada']);
});

test('duas tentativas simultâneas não executam duas renovações e token antigo não é reutilizado', async () => {
  let ocupado = false;
  navigator.locks = { request: async (_nome, _opcoes, callback) => {
    if (ocupado) return callback(null);
    ocupado = true;
    try { return await callback({}); } finally { ocupado = false; }
  }};
  const anterior = jwt('a', agora + 1000);
  const novo = jwt('a', agora + 3600000);
  salvarToken(anterior);
  let liberar;
  const espera = new Promise((resolve) => { liberar = resolve; });
  let chamadas = 0;
  const primeira = comBloqueioRenovacao(anterior, async () => {
    chamadas++;
    await espera;
    salvarToken(novo);
  });
  await comBloqueioRenovacao(anterior, async () => { chamadas++; });
  liberar();
  await primeira;
  await comBloqueioRenovacao(anterior, async () => { chamadas++; });
  assert.equal(chamadas, 1);
  assert.equal(obterToken(), novo);
});

test('sem Web Locks não inicia renovação concorrente insegura', async () => {
  const token = jwt('a', agora + 1000);
  salvarToken(token);
  await comBloqueioRenovacao(token, async () => assert.fail('não deveria renovar'));
  assert.equal(obterToken(), token);
});
