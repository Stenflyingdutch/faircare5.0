import type { ReactNode } from 'react';

interface PreQuestionStepProps {
  question: string;
  questionId: string;
  children: ReactNode;
}

export default function PreQuestionStep({ question, questionId, children }: PreQuestionStepProps) {
  return (
    <div className="quiz-pre-question-flow">
      <p id={questionId} className="quiz-pre-question">
        {question}
      </p>
      <fieldset className="quiz-fieldset stack" aria-labelledby={questionId}>
        <div className="stack">{children}</div>
      </fieldset>
    </div>
  );
}
