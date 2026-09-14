import { mockPolicies } from '@/src/mocks/data';
import { apiRequest, USE_MOCK } from '@/src/api/client';
import type { Policy, PolicyType } from '@/src/types';

export const policiesApi = {
  /** GET /api/policies/latest?policy_type= */
  async getLatest(policyType: PolicyType): Promise<Policy> {
    if (USE_MOCK) return mockPolicies[policyType];
    return apiRequest<Policy>('/api/policies/latest', {
      query: { policy_type: policyType },
    });
  },
};
