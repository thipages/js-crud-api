import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock fetch — captures calls
let lastFetchCall;
globalThis.fetch = async (url, config) => {
    lastFetchCall = { url, config };
    return { status: 200, ok: true, json: async () => ({}) };
};

const { default: jscrudapi } = await import('../esm/index.js');
const api = jscrudapi('http://test/api.php');

beforeEach(() => {
    lastFetchCall = null;
});

// --- Multiple IDs ---

test('read with array IDs joins them with comma', async () => {
    await api.read('posts', [1, 2]);
    assert.ok(lastFetchCall.url.includes('records/posts/1,2'));
});

test('update with array IDs joins them with comma', async () => {
    await api.update('posts', [1, 2], [{ content: 'a' }, { content: 'b' }]);
    assert.ok(lastFetchCall.url.includes('records/posts/1,2'));
});

test('delete with array IDs joins them with comma', async () => {
    await api.delete('posts', [1, 2]);
    assert.ok(lastFetchCall.url.includes('records/posts/1,2'));
});

test('read with string IDs passes through', async () => {
    await api.read('posts', '1,2');
    assert.ok(lastFetchCall.url.includes('records/posts/1,2'));
});

// --- Filters ---

test('filter as string', async () => {
    await api.list('posts', { filter: 'id,eq,1' });
    assert.ok(lastFetchCall.url.includes('?filter=id,eq,1'));
});

test('filter as single-element array', async () => {
    await api.list('posts', { filter: ['id,eq,1'] });
    assert.ok(lastFetchCall.url.includes('?filter=id,eq,1'));
});

test('filter as nested array', async () => {
    await api.list('posts', { filter: [['id', 'eq', '1']] });
    assert.ok(lastFetchCall.url.includes('?filter=id,eq,1'));
});

test('filter as multiple strings', async () => {
    await api.list('posts', { filter: ['id,ge,1', 'id,le,3'] });
    assert.ok(lastFetchCall.url.includes('filter=id,ge,1'));
    assert.ok(lastFetchCall.url.includes('filter=id,le,3'));
    assert.ok(lastFetchCall.url.includes('&'));
});

test('filter as mixed arrays and strings', async () => {
    await api.list('posts', { filter: [['id', 'ge', '1'], 'id,le,3'] });
    assert.ok(lastFetchCall.url.includes('filter=id,ge,1'));
    assert.ok(lastFetchCall.url.includes('filter=id,le,3'));
});

test('filter1 and filter2 for OR logic', async () => {
    await api.list('posts', { filter1: ['id,eq,1'], filter2: ['id,eq,2'] });
    assert.ok(lastFetchCall.url.includes('filter1=id,eq,1'));
    assert.ok(lastFetchCall.url.includes('filter2=id,eq,2'));
});

// --- Include / Exclude ---

test('include as string', async () => {
    await api.list('posts', { include: 'id' });
    assert.ok(lastFetchCall.url.includes('?include=id'));
});

test('exclude as array joins with comma', async () => {
    await api.list('posts', { exclude: ['login', 'pass'] });
    assert.ok(lastFetchCall.url.includes('?exclude=login,pass'));
});

// --- Pagination ---

test('page as array joins with comma', async () => {
    await api.list('posts', { page: [1, 2] });
    assert.ok(lastFetchCall.url.includes('?page=1,2'));
});

test('page as string', async () => {
    await api.list('posts', { page: '1,2' });
    assert.ok(lastFetchCall.url.includes('?page=1,2'));
});

test('size as number', async () => {
    await api.list('posts', { size: 1 });
    assert.ok(lastFetchCall.url.includes('?size=1'));
});

// --- Joins ---

test('join as string', async () => {
    await api.list('posts', { join: 'comments' });
    assert.ok(lastFetchCall.url.includes('?join=comments'));
});

test('join as array of strings', async () => {
    await api.list('posts', { join: ['comments', 'tags'] });
    assert.ok(lastFetchCall.url.includes('join=comments'));
    assert.ok(lastFetchCall.url.includes('join=tags'));
});

test('join with nested path', async () => {
    await api.list('posts', { join: [['comments,users'], 'tags'] });
    assert.ok(lastFetchCall.url.includes('join=comments,users'));
    assert.ok(lastFetchCall.url.includes('join=tags'));
});

// --- Order ---

test('order as string', async () => {
    await api.list('posts', { order: 'login,desc' });
    assert.ok(lastFetchCall.url.includes('?order=login,desc'));
});

test('order as array of strings', async () => {
    await api.list('posts', { order: ['user_id', 'login,desc'] });
    assert.ok(lastFetchCall.url.includes('order=user_id'));
    assert.ok(lastFetchCall.url.includes('order=login,desc'));
});

// --- dbAuth ---

test('login sends POST with credentials', async () => {
    await api.login('admin', 'secret');
    assert.equal(lastFetchCall.url, 'http://test/api.php/login');
    assert.equal(lastFetchCall.config.method, 'POST');
    const body = JSON.parse(lastFetchCall.config.body);
    assert.deepEqual(body, { username: 'admin', password: 'secret' });
});

test('logout sends POST with empty body', async () => {
    await api.logout();
    assert.equal(lastFetchCall.url, 'http://test/api.php/logout');
    assert.equal(lastFetchCall.config.method, 'POST');
    const body = JSON.parse(lastFetchCall.config.body);
    assert.deepEqual(body, {});
});

test('me sends GET request', async () => {
    await api.me();
    assert.equal(lastFetchCall.url, 'http://test/api.php/me');
    assert.equal(lastFetchCall.config.method, 'GET');
});

test('register sends POST with credentials', async () => {
    await api.register('newuser', 'pass123');
    assert.equal(lastFetchCall.url, 'http://test/api.php/register');
    assert.equal(lastFetchCall.config.method, 'POST');
    const body = JSON.parse(lastFetchCall.config.body);
    assert.deepEqual(body, { username: 'newuser', password: 'pass123' });
});

test('password sends POST with credentials and new password', async () => {
    await api.password('admin', 'old', 'new');
    assert.equal(lastFetchCall.url, 'http://test/api.php/password');
    assert.equal(lastFetchCall.config.method, 'POST');
    const body = JSON.parse(lastFetchCall.config.body);
    assert.deepEqual(body, { username: 'admin', password: 'old', newPassword: 'new' });
});

// --- Config headers ---

test('custom headers are passed to fetch', async () => {
    const apiWithHeaders = jscrudapi('http://test/api.php', {
        headers: { 'X-API-Key': 'my-key' }
    });
    await apiWithHeaders.list('posts');
    assert.equal(lastFetchCall.config.headers['X-API-Key'], 'my-key');
});
