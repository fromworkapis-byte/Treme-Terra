// ===== ARRASTE PARA REORDENAR A ANTIGUIDADE DO EFETIVO =====
import * as React from 'react';
import type { Member } from '../types';

/** Reordena apenas os integrantes visíveis, mantendo os ocultos em suas posições. */
export function reorderMemberIds(members: Member[], visibleIds: string[], fromId: string, toId: string): string[] {
  const original = members.map(member => member.id);
  const from = visibleIds.indexOf(fromId);
  const to = visibleIds.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return original;

  const reordered = [...visibleIds];
  reordered.splice(from, 1);
  reordered.splice(to, 0, fromId);

  const visible = new Set(visibleIds);
  let cursor = 0;
  return original.map(id => (visible.has(id) ? reordered[cursor++] : id));
}

interface UseMemberDragReorderOptions {
  members: Member[];
  visibleMembers: Member[];
  onReorder: (orderedIds: string[]) => void;
}

export function useMemberDragReorder({ members, visibleMembers, onReorder }: UseMemberDragReorderOptions) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const dragRef = React.useRef<{ id: string; pointerId: number } | null>(null);
  const overRef = React.useRef<string | null>(null);

  const commit = React.useCallback((fromId: string, toId: string) => {
    const next = reorderMemberIds(members, visibleMembers.map(member => member.id), fromId, toId);
    if (next.some((id, index) => id !== members[index]?.id)) onReorder(next);
  }, [members, visibleMembers, onReorder]);

  const handlePointerDown = (id: string, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    dragRef.current = { id, pointerId: event.pointerId };
    overRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setOverId(null);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const active = dragRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    const target = document.elementsFromPoint(event.clientX, event.clientY)
      .map(element => element.closest('[data-member-row]') as HTMLElement | null)
      .find(row => row && row.dataset.memberRow !== active.id);
    const nextOverId = target?.dataset.memberRow || null;
    overRef.current = nextOverId;
    setOverId(nextOverId);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    const active = dragRef.current;
    if (!active || event.pointerId !== active.pointerId) return;
    if (overRef.current) commit(active.id, overRef.current);
    dragRef.current = null;
    overRef.current = null;
    setDraggingId(null);
    setOverId(null);
  };

  const handleKeyDown = (id: string, event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const visibleIds = visibleMembers.map(member => member.id);
    const index = visibleIds.indexOf(id);
    const target = visibleIds[index + (event.key === 'ArrowUp' ? -1 : 1)];
    if (!target) return;
    event.preventDefault();
    commit(id, target);
  };

  return {
    draggingId,
    overId,
    rowProps: (id: string) => ({ 'data-member-row': id }),
    handleProps: (id: string) => ({
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => handlePointerDown(id, event),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(id, event),
    }),
  };
}
