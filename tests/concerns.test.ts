import assert from 'node:assert/strict';
import test from 'node:test';
import { canReconnectDraft, concernCounts, inConcernQueue, isEntryMessage, mergeConcernReceipt, nextConcernId, oldestConcernsFirst, originalGroups } from '../app/dashboard/concerns/concern-model.ts';

test('reconnect recovers failed transport without duplicating a working draft', () => {
  const now = Date.parse('2026-09-11T04:00:00Z');
  const fresh = '2026-09-11T03:59:59Z';
  assert.equal(canReconnectDraft({state:'failed',updated_at:fresh}, undefined, now), true);
  assert.equal(canReconnectDraft({state:'uncertain',updated_at:fresh}, undefined, now), true);
  assert.equal(canReconnectDraft({state:'accepted',updated_at:fresh}, undefined, now), false);
  assert.equal(canReconnectDraft({state:'delivering',updated_at:fresh}, undefined, now), false);
  assert.equal(canReconnectDraft({state:'delivering',updated_at:'2026-09-11T03:59:00Z'}, undefined, now), true);
  assert.equal(canReconnectDraft({state:'accepted',updated_at:'2026-09-11T03:49:00Z'}, undefined, now), true);
  assert.equal(canReconnectDraft({state:'failed',updated_at:fresh}, fresh, now), false);
});

test('queue orders current incoming concerns instead of first contact months ago', () => {
  const source = [
    { id: 'new', last_message_at: '2026-09-02T00:00:00+09:00' },
    { id: 'old', waiting_since: '2026-06-29T17:10:00+09:00', last_message_at: '2026-09-07T20:31:00+09:00' },
    { id: 'earliest-current', current_received_at: '2026-08-01T09:00:00+09:00', last_message_at: '2026-09-10T18:00:00+09:00' },
    { id: 'date-only', current_received_at: '2026-08-05 (개별 시각 미표시)', last_message_at: '2026-09-10T18:00:00+09:00' },
    { id: 'unknown', last_message_at: '' },
  ];
  assert.deepEqual(oldestConcernsFirst(source).map(i=>i.id), ['earliest-current','date-only','new','old','unknown']);
  assert.equal(source[0].id, 'new');
});

test('Hanna replies after the latest concern are not moved into earlier history', () => {
  const messages = [
    { role: 'hanna' as const, text: '예전 답장', at: '2026-06-01T10:00:00+09:00' },
    { role: 'inbound' as const, text: '이번 고민', at: '2026-09-01T10:00:00+09:00' },
    { role: 'hanna' as const, text: '다음날 답장', at: '2026-09-02T10:00:00+09:00' },
  ];
  assert.deepEqual(originalGroups(messages).recent.map(m => m.text), ['이번 고민', '다음날 답장']);
  assert.deepEqual(originalGroups(messages).earlier.map(m => m.text), ['예전 답장']);
});

test('originals use Korean dates without splitting one day across UTC midnight', () => {
  const messages = [
    { role: 'inbound' as const, text: '예전 고민', at: '2026-06-29T17:10:00+09:00' },
    { role: 'hanna' as const, text: '이전 답장', at: '2026-07-01 (개별 시각 미표시)' },
    { role: 'inbound' as const, text: '지금 고민', at: '2026-09-07T23:31:00Z', attachments: [{id:'a.jpg',label:'원본'}] },
    { role: 'inbound' as const, text: '추가 설명', at: '2026-09-08T09:00:00+09:00' },
    { role: 'automatic' as const, text: '자동 안내', at: '2026-09-08T10:00:00+09:00' },
  ];
  const group = originalGroups(messages);
  assert.deepEqual(group.earlier.map(m=>m.text), ['예전 고민','이전 답장']);
  assert.deepEqual(group.recent.map(m=>m.text), ['지금 고민','추가 설명']);
  assert.equal(group.recent[0].attachments?.length, 1);
});

test('passed concerns are separate from unanswered and actually replied messages', () => {
  const items = [
    { id: 'waiting', state: 'needs_reply', workspace_status: 'draft' },
    { id: 'pass', state: 'resolved', workspace_status: 'skipped' },
    { id: 'sent', state: 'waiting_partner', workspace_status: 'sent' },
    { id: 'new-after-pass', state: 'needs_reply', workspace_status: 'needs_context' },
  ];
  assert.deepEqual(items.filter(i => inConcernQueue(i, 'open')).map(i => i.id), ['waiting', 'new-after-pass']);
  assert.deepEqual(items.filter(i => inConcernQueue(i, 'skipped')).map(i => i.id), ['pass']);
  assert.deepEqual(items.filter(i => inConcernQueue(i, 'replied')).map(i => i.id), ['sent']);
  assert.equal(items.filter(i => inConcernQueue(i, 'all')).length, 4);
  assert.equal(inConcernQueue({state:'needs_reply', workspace_status:'skipped'}, 'open'), false);
});

test('passing advances within the visible queue and handles its last item', () => {
  const visible = [{ id: 'first' }, { id: 'middle' }, { id: 'last' }];
  assert.equal(nextConcernId(visible, 'first'), 'middle');
  assert.equal(nextConcernId(visible, 'middle'), 'last');
  assert.equal(nextConcernId(visible, 'last'), 'first');
  assert.equal(nextConcernId([{id:'only'}], 'only'), '');
  assert.equal(nextConcernId([], 'missing'), '');
});

test('counts separate direct replies from queued sends and drafts still needing attention', () => {
  const items = [
    { state:'needs_reply', workspace_status:'draft' },
    { state:'needs_reply', workspace_status:'approved' },
    { state:'needs_reply', workspace_status:'preparing' },
    { state:'followup', workspace_status:'answered' },
    { state:'waiting_partner', workspace_status:'sent' },
    { state:'resolved', workspace_status:'skipped' },
  ];
  assert.deepEqual(concernCounts(items), {all:6,open:1,replied:2,skipped:1,queued:1,preparing:1,waiting:0,draft:1,needsDraft:0});
  assert.equal(inConcernQueue(items[3], 'open'), false);
  assert.equal(inConcernQueue(items[1], 'replied'), false);
});


test('every registered concern has one stage and uncertain sends are not completed', () => {
  const items = [
    {state:'waiting_partner', workspace_status:'uncertain'},
    {state:'waiting_partner', workspace_status:'sending'},
    {state:'needs_reply', workspace_status:'idle', has_current_concern:false},
    {state:'waiting_partner', workspace_status:'needs_context'},
    {state:'resolved', workspace_status:'blocked'},
    {state:'needs_reply', workspace_status:'idle', has_current_concern:null},
  ];
  const counts = concernCounts(items);
  assert.equal(counts.queued, 2);
  assert.equal(counts.replied, 0);
  assert.equal(counts.waiting, 1);
  assert.equal(counts.open, 3);
  for (const item of items) assert.equal(['open','preparing','queued','replied','waiting','skipped'].filter(f=>inConcernQueue(item, f as Parameters<typeof inConcernQueue>[1])).length, 1);
});

test('mutation receipts update counts immediately and survive older in-flight polls', () => {
  const old = {id:'a', workspace_revision:3, workspace_status:'draft', state:'needs_reply'};
  const approved = {...old, workspace_revision:4, workspace_status:'approved'};
  const cancelled = {...old, workspace_revision:5};
  assert.equal(concernCounts([mergeConcernReceipt(old, approved)]).open, 0);
  assert.equal(concernCounts([mergeConcernReceipt(old, approved)]).queued, 1);
  assert.equal(mergeConcernReceipt(cancelled, approved).workspace_status, 'draft');
  assert.equal(concernCounts([mergeConcernReceipt(approved, cancelled)]).open, 1);
  const answered = {...old, workspace_revision:6, workspace_status:'answered'};
  assert.equal(concernCounts([mergeConcernReceipt(answered, cancelled)]).replied, 1);
});

test('start buttons do not become the current question or hide actual short concerns', () => {
  const before = {role:'inbound' as const, text:'힘들어요', at:'2026-09-01T09:00:00+09:00'};
  const reply = {role:'hanna' as const, text:'답장', at:'2026-09-02T09:00:00+09:00'};
  const button = {role:'inbound' as const, text:'고민있어요!', at:'2026-09-03T09:00:00+09:00'};
  const group = originalGroups([button, before, reply, button]);
  assert.deepEqual(group.recent, [before, reply]);
  assert.equal(group.entries.length, 2);
  assert.deepEqual(originalGroups([button]).recent, []);
  for (const text of ['고민있어요. 친구가 자꾸 피해서 힘들어요', '힘들어요', '궁금해요!', '고민있어요 ㅠㅠ']) assert.equal(isEntryMessage({...button,text}), false);
  assert.equal(isEntryMessage({...button, attachments:[{id:'photo',label:'고민 원문'}]}), false);
  assert.equal(isEntryMessage({...button,role:'hanna'}), false);
});
