import { QuestionType } from './types';

export const LANGUAGES: string[] = ['Español', 'Inglés'];
export const GRADES: string[] = ['1ro', '2do', '3ro', '4to', '5to', '6to', '7mo', '8vo', '9no', '10mo', '11vo', '12vo'];
export const DIFFICULTIES: string[] = ['Básico', 'Intermedio', 'Avanzado'];
export const SUBJECTS: string[] = ['Comprensión de Lectura', 'Matemáticas', 'Ciencias', 'Historia', 'Lengua y Literatura'];

export const getQuestionTypeOptions = (language: string): { label: string; value: QuestionType }[] => {
    const labels = {
        'Español': {
            'multiple-choice': 'Selección Múltiple',
            'true-false': 'Verdadero o Falso',
            'open-ended': 'Preguntas Abiertas',
            'fill-in-the-blanks': 'Llenar Espacios',
            'matching': 'Pareo',
        },
        'Inglés': {
            'multiple-choice': 'Multiple Choice',
            'true-false': 'True or False',
            'open-ended': 'Open-ended Questions',
            'fill-in-the-blanks': 'Fill in the Blanks',
            'matching': 'Matching',
        }
    };
    const langKey = language === 'Inglés' ? 'Inglés' : 'Español';
    const selectedLabels = labels[langKey];

    return [
      { label: selectedLabels['multiple-choice'], value: 'multiple-choice' },
      { label: selectedLabels['true-false'], value: 'true-false' },
      { label: selectedLabels['open-ended'], value: 'open-ended' },
      { label: selectedLabels['fill-in-the-blanks'], value: 'fill-in-the-blanks' },
      { label: selectedLabels['matching'], value: 'matching' },
    ];
};


export const EXERCISE_COUNTS: number[] = [5, 10, 15, 20, 25, 30, 40, 45];
