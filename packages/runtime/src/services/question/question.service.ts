import { questionActionAnswer } from './question-action.answer';
import { questionActionAsk } from './question-action.ask';
import { questionQueryPending } from './question-query.pending';
import type * as QuestionTypes from '../../types/question.types';
import type { Context } from '@earendil-works/chord/context';

export function makeQuestionService(deps: QuestionTypes.QuestionServiceDeps) {
  return {
    actions: {
      answer: (params: QuestionTypes.QuestionAnswerParams, context: Context) => questionActionAnswer(deps, { ...params, context }),
      ask: (params: Omit<QuestionTypes.QuestionAskCall, 'context'>, context: Context) => questionActionAsk({ ...params, context }),
    },
    queries: {
      pending: (params: QuestionTypes.QuestionPendingParams, context: Context) => questionQueryPending(deps, { ...params, context }),
    },
  };
}

export type QuestionService = ReturnType<typeof makeQuestionService>;
