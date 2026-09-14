import { mockChecklist } from '@/src/mocks/data';
import { apiRequest, USE_MOCK } from '@/src/api/client';
import type { Checklist, ChecklistItem } from '@/src/types';

let localChecklist: Checklist = {
  ...mockChecklist,
  items: mockChecklist.items.map((item) => ({ ...item })),
};
let nextItemId = 20;

export const checklistsApi = {
  /** POST /api/travel-plans/:id/checklists */
  async generate(travelPlanId: number) {
    if (USE_MOCK) return { ...localChecklist, travel_plan_id: travelPlanId };
    return apiRequest<Checklist>(`/api/travel-plans/${travelPlanId}/checklists`, { method: 'POST' });
  },

  /** GET /api/travel-plans/:id/checklists */
  async getByPlan(travelPlanId: number) {
    if (USE_MOCK) return { ...localChecklist, travel_plan_id: travelPlanId };
    return apiRequest<Checklist>(`/api/travel-plans/${travelPlanId}/checklists`);
  },

  /** POST /api/checklists/:id/items */
  async addItem(checklistId: number, content: string) {
    if (USE_MOCK) {
      const item: ChecklistItem = {
        checklist_item_id: nextItemId++,
        content,
        is_checked: false,
        sort_order: localChecklist.items.length + 1,
      };
      localChecklist.items = [...localChecklist.items, item];
      return item;
    }
    return apiRequest<ChecklistItem>(`/api/checklists/${checklistId}/items`, {
      method: 'POST',
      body: { content },
    });
  },

  /** PATCH /api/checklist-items/:id */
  async updateItem(itemId: number, patch: Partial<Pick<ChecklistItem, 'content' | 'is_checked'>>) {
    if (USE_MOCK) {
      localChecklist.items = localChecklist.items.map((item) =>
        item.checklist_item_id === itemId ? { ...item, ...patch } : item,
      );
      return localChecklist.items.find((item) => item.checklist_item_id === itemId)!;
    }
    return apiRequest<ChecklistItem>(`/api/checklist-items/${itemId}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  /** DELETE /api/checklist-items/:id */
  async removeItem(itemId: number) {
    if (USE_MOCK) {
      localChecklist.items = localChecklist.items.filter((item) => item.checklist_item_id !== itemId);
      return;
    }
    await apiRequest<void>(`/api/checklist-items/${itemId}`, { method: 'DELETE' });
  },
};
