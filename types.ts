export type QuestionType = 'multiple-choice' | 'true-false' | 'open-ended' | 'fill-in-the-blanks' | 'matching';

export interface MatchingTerm {
  id: string;
  term: string;
}

export interface MatchingDefinition {
  id: string;
  definition: string;
}

export interface Question {
  questionNumber: number;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  answer?: string | boolean | Record<string, string>;
  matchingTerms?: MatchingTerm[];
  matchingDefinitions?: MatchingDefinition[];
}

export interface Worksheet {
  title: string;
  mainContent: string;
  questions: Question[];
}

export interface UserFile {
  name: string;
  mimeType: string;
  data: string; // base64 encoded data (without data: prefix)
  preview: string; // data URL for preview
}

export interface FormState {
  language: string;
  grade: string;
  difficulty: string;
  subject: string;
  topic: string;
  includeAnswers: boolean;
  showJson: boolean;
  questionTypes: QuestionType[];
  questionCount: number;
  userContent: string;
  userFile: UserFile | null;
  documentType: 'worksheet' | 'exam';
  teacherName: string;
  schoolName: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  idToken: string; // Token de ID de Google para autenticar en el backend
}
