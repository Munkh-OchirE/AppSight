import type { Answer, Assessment } from "@prisma/client";
import { questions } from "@/config/questions";
import {
  answerKey,
  buildAnswerMap,
  cleanExclusiveAnswerMap,
  isQuestionVisible,
  type AnswerMap
} from "@/lib/dynamicQuestions/ruleEvaluator";

export type SubmittedAnswer = {
  section: string;
  field: string;
  value: unknown;
  state?: string;
  confidence?: string;
  source?: string;
  confirmed?: boolean;
};

function submittedToMap(answers: SubmittedAnswer[]) {
  return answers.reduce<AnswerMap>((map, answer) => {
    map[answerKey(answer.section, answer.field)] = answer.value;
    return map;
  }, {});
}

export function cleanSubmittedAnswers(answers: SubmittedAnswer[]) {
  const originalMap = submittedToMap(answers);
  const cleanedMap = cleanExclusiveAnswerMap(originalMap);
  const output = [...answers];
  const existingKeys = new Set(output.map((answer) => answerKey(answer.section, answer.field)));

  for (const [key, cleanedValue] of Object.entries(cleanedMap)) {
    if (originalMap[key] === cleanedValue) {
      continue;
    }

    const [section, field] = key.split(".");

    if (!section || !field) {
      continue;
    }

    if (existingKeys.has(key)) {
      const answer = output.find((item) => answerKey(item.section, item.field) === key);

      if (answer) {
        answer.value = cleanedValue;
      }
    } else {
      output.push({
        section,
        field,
        value: cleanedValue,
        state: "user_confirmed",
        confirmed: true,
        source: "dynamic_wizard"
      });
    }
  }

  return output;
}

export function getVisibleQuestions(input: {
  assessment: Assessment;
  answers: Answer[];
  submittedAnswers?: SubmittedAnswer[];
}) {
  const persistedMap = buildAnswerMap(input.assessment, input.answers);
  const submittedMap = input.submittedAnswers
    ? submittedToMap(cleanSubmittedAnswers(input.submittedAnswers))
    : {};
  const answerMap = cleanExclusiveAnswerMap({
    ...persistedMap,
    ...submittedMap
  });

  return questions.filter((question) => isQuestionVisible(question, answerMap));
}
