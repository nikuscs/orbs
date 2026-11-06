export const TOOL = {
  jevCredential: 'typesafe.apiKey',
  approvalRulesSetting: 'tools.approvalRules',
  approvalTimeoutSetting: 'tools.approvalTimeoutMinutes',
  alwaysAllowSettingPrefix: 'tools.alwaysAllow.',
  askFirstTools: ['bot_mcp_add', 'bot_note'],
  judgeTimeoutMs: 5000,
  minuteMs: 60_000,
  judgeThreshold: 0.9,
  judgeAskThreshold: 0.1,
  judgeInputLimit: 2000,
  judgeRequestLimit: 8000,
} as const;

