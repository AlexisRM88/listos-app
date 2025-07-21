
import { Worksheet, FormState } from '../types';
import config from '../config';

const createPrompt = (
    formState: FormState
): string => {
  const {
    language,
    grade,
    difficulty,
    subject,
    topic,
    includeAnswers,
    questionTypes,
    questionCount,
    userContent,
    userFile,
    documentType,
  } = formState;

  let contentInstruction: string;
  const langKey = language === 'Inglés' ? 'Inglés' : 'Español';

  if (userFile) {
     contentInstruction = langKey === 'Inglés'
        ? `The user has provided an image. Use this image as the primary source material for all questions. For the 'mainContent' field in the JSON, create a concise description of the image (around 100-150 words) that is appropriate for the grade level and serves as context for the questions. The questions MUST be based on the provided image.`
        : `El usuario ha proporcionado una imagen. Utiliza esta imagen como material de origen principal para todas las preguntas. Para el campo 'mainContent' en el JSON, crea una descripción concisa de la imagen (alrededor de 100-150 palabras) que sea apropiada para el nivel de grado y sirva como contexto para las preguntas. Las preguntas DEBEN basarse en la imagen proporcionada.`;
  } else if (userContent && userContent.trim().length > 10) {
      contentInstruction = `The user has provided the following text. Use this text as the primary source material for all questions. For the 'mainContent' field in the JSON, create a concise summary of the provided text (around 100-150 words) that is appropriate for the grade level and serves as context for the questions. Do NOT include the full original text in the 'mainContent' field. The questions MUST be based on the original provided text. \n\nUSER-PROVIDED TEXT:\n"""\n${userContent}\n"""\n`;
  } else {
      contentInstruction = subject === 'Comprensión de Lectura'
        ? `For the 'mainContent', write a text passage between 100 and 250 words about '${topic || 'a general interest topic'}'. The topic, vocabulary, and sentence structure must be appropriate for the specified grade and difficulty.`
        : `For the 'mainContent', provide a brief introduction or context for the exercises related to the subject '${subject}' and topic '${topic}'. This could be definitions, examples, or a short explanatory text. If no context is needed, this field can be an empty string "" and the questions should be self-contained.`;
  }


  const questionTypeInstruction = questionTypes.length > 1
    ? `Generate a mix of the following question types: ${questionTypes.join(', ')}. Distribute the ${questionCount} questions as evenly as possible among these types.`
    : `All questions must be of this type: ${questionTypes[0]}.`;

  const documentTypeInstruction = documentType === 'exam' 
    ? "The tone should be formal, suitable for an evaluation or exam."
    : "The tone should be that of a practice worksheet, aimed at reinforcing concepts.";

  return `
    You are an expert educational assistant. Your task is to generate an educational ${documentType}.
    ALL CONTENT you generate (titles, instructions, questions, answers, options etc.) MUST be in the specified language: ${language}.

    **User Requirements:**
    - Language: ${language}
    - Grade Level: ${grade}
    - Difficulty Level: ${difficulty}
    - Subject: ${subject}
    - Topic: ${topic}
    - Number of Questions: ${questionCount}
    - Selected Question Types: ${questionTypes.join(', ')}
    - Document Type: ${documentType} (${documentTypeInstruction})
    - Include Answer Key: ${includeAnswers}

    **Instructions:**
    Generate a single, valid JSON object. Do not include any text, notes, or markdown formatting like \`\`\`json outside of the JSON block itself. The entire response must be ONLY the JSON object.

    The JSON object must conform to the following TypeScript interface:

    interface Question {
      questionNumber: number;
      questionText: string;
      questionType: "multiple-choice" | "true-false" | "open-ended" | "fill-in-the-blanks" | "matching";
      options?: string[]; // For 'multiple-choice' type. Must have at least 3 options.
      answer?: string | boolean | Record<string, string>; // Include this field ONLY if 'Include Answer Key' is true. For 'matching', this is an object mapping term ID to definition ID, e.g., {"1": "c", "2": "a"}.
      matchingTerms?: { id: string; term: string; }[]; // For 'matching' type only. The left column. Use numbers as strings for id ("1", "2", ...).
      matchingDefinitions?: { id: string; definition: string; }[]; // For 'matching' type only. The right column. Use letters for id ("a", "b", ...).
    }

    interface Worksheet {
      title: string;
      mainContent: string;
      questions: Question[];
    }

    **Detailed Field Instructions:**
    - \`title\`: Create a descriptive title in ${language} for this ${documentType}, incorporating the subject and topic.
    - \`mainContent\`: ${contentInstruction}
    - \`questions\`: An array of exactly ${questionCount} questions. ${questionTypeInstruction}
        - For 'fill-in-the-blanks' questions, include one or more blanks in the \`questionText\` represented by a long underline '_________'. The \`answer\` should be a string containing the word(s) that fill the blank(s), separated by commas if multiple.
        - For 'multiple-choice' questions, provide plausible options.
        - For 'true-false' questions, if the language is 'Español', the answer MUST be 'Cierto' or 'Falso'. If the language is 'Inglés', the answer MUST be 'True' or 'False'.
        - For 'matching' questions, this whole question object represents ONE matching exercise.
            - \`questionText\` should be the instruction (e.g., "Match the terms with their definitions.").
            - \`matchingTerms\` should be an array of objects for the left column. The \`id\` should be a number as a string ("1", "2", ...).
            - \`matchingDefinitions\` should be an array of objects for the right column. The \`id\` should be a letter ("a", "b", ...). The list MUST be shuffled so it's not in the correct order.
            - Both \`matchingTerms\` and \`matchingDefinitions\` arrays must have the same number of items.
            - The \`answer\` (if requested) must be a JSON object mapping the \`id\` from \`matchingTerms\` to the corresponding \`id\` from \`matchingDefinitions\`. For example: \`{"1": "e", "2": "a", "3": "d"}\`.
        - \`answer\`: Provide the correct answer. For 'multiple-choice', it's the string of the correct option. For 'true-false', it's a boolean (true/false). For 'open-ended', it's a sample correct answer. For 'fill-in-the-blanks', it is the missing word/phrase. For 'matching' it's an object as described above. Only include this field if the user requested an answer key.
    
    Generate the ${documentType} JSON now.
  `;
};

export const generateWorksheet = async (
  formState: FormState,
  idToken: string
): Promise<Worksheet> => {
  if (!config.geminiProxyUrl) {
    throw new Error("Configuración de backend incompleta.");
  }

  let rawResponseText = '';
  try {
    const prompt = createPrompt(formState);
    
    let modelContents;
    if (formState.userFile) {
      const imagePart = {
        inlineData: {
            mimeType: formState.userFile.mimeType,
            data: formState.userFile.data,
        },
      };
      const textPart = { text: prompt };
      modelContents = { parts: [imagePart, textPart] };
    } else {
      modelContents = prompt;
    }

    const requestBody = {
        modelContents: modelContents,
        config: {
            temperature: 0.7,
        }
    };

    const response = await fetch(config.geminiProxyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Respuesta de error no es JSON' }));
        throw new Error(`Error del servidor (${response.status}): ${errorData.error || response.statusText}`);
    }

    const responseData = await response.json();
    rawResponseText = responseData.text;
    
    const parsedData = JSON.parse(rawResponseText);
    return parsedData as Worksheet;

  } catch (error) {
    console.error("Error during proxy call or JSON parsing:", error);
    if (rawResponseText) {
      console.error("Raw response text from proxy:", rawResponseText);
    }

    const langKey = formState.language === 'Inglés' ? 'Inglés' : 'Español';
    const T = {
        'Español': {
            default: "Ocurrió un error inesperado al generar el documento.",
            auth: "Falló la autenticación. Por favor, intenta iniciar sesión de nuevo.",
            format: "La IA devolvió una respuesta en un formato inesperado. Intenta ajustar la consulta o inténtalo de nuevo más tarde.",
            network: "Error de red: No se pudo conectar con el servidor. Revisa tu conexión a internet.",
        },
        'Inglés': {
            default: "An unexpected error occurred while generating the document.",
            auth: "Authentication failed. Please try logging in again.",
            format: "The AI returned a response in an unexpected format. Try adjusting your query or try again later.",
            network: "Network Error: Could not connect to the server. Check your internet connection.",
        }
    };
    
    let finalErrorMessage = T[langKey].default;
    if (error instanceof TypeError) { // TypeError often indicates a network-level failure (e.g., CORS, DNS, offline).
        finalErrorMessage = T[langKey].network;
    } else if (error instanceof Error) {
        const lowerCaseError = error.message.toLowerCase();
        if (lowerCaseError.includes("authentication failed")) {
            finalErrorMessage = T[langKey].auth;
        } else if (error instanceof SyntaxError || lowerCaseError.includes("json")) {
            finalErrorMessage = T[langKey].format;
        } else if (lowerCaseError.includes("configuración de backend") || lowerCaseError.includes("error del servidor")){
            finalErrorMessage = error.message;
        }
    }
    
    throw new Error(finalErrorMessage);
  }
};
