import { apiClient, MockInterceptError } from '../lib/apiClient'
import { API_ENDPOINTS } from '../constants/api'
import { toRecord, unwrapData } from '../lib/apiResponse'

export interface RuleMetadata {
  conditions: unknown[]
  actions: unknown[]
  operators: unknown[]
  valueTypes: unknown[]
}

function normalizeRuleMetadata(payload: unknown): RuleMetadata {
  const record = toRecord(unwrapData(payload))
  return {
    conditions: Array.isArray(record.conditions) ? record.conditions : [],
    actions: Array.isArray(record.actions) ? record.actions : [],
    operators: Array.isArray(record.operators) ? record.operators : [],
    valueTypes: Array.isArray(record.value_types)
      ? record.value_types
      : Array.isArray(record.valueTypes)
        ? record.valueTypes
        : [],
  }
}

export const rulesService = {
  async getMetadata(): Promise<RuleMetadata> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.RULES.METADATA)
      return normalizeRuleMetadata(response.data)
    } catch (error) {
      if (error instanceof MockInterceptError) {
        return {
          conditions: ['equals', 'not_equals', 'contains'],
          actions: ['show', 'hide', 'trigger_action'],
          operators: ['and', 'or'],
          valueTypes: ['string', 'number', 'boolean', 'date'],
        }
      }
      throw error
    }
  },
}
