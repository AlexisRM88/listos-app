import React, { useState, useMemo } from 'react';
import { extractRawText } from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { LANGUAGES, GRADES, DIFFICULTIES, SUBJECTS, getQuestionTypeOptions, EXERCISE_COUNTS } from '../constants';
import { QuestionType, FormState, UserFile } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import config from '../config';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

interface InputFormProps {
  onGenerate: (formState: FormState) => void;
  isLoading: boolean;
  isPro: boolean;
  remainingGenerations: number;
}

const uiText = {
    'Español': {
        title: 'Crear Tu Documento',
        teacherName: 'Nombre del Maestro(a)',
        schoolName: 'Nombre de la Escuela',
        optional: '(Opcional)',
        contentSource: 'Fuente del Contenido',
        pasteContent: 'Contenido Específico (Opcional)',
        pastePlaceholder: 'Pega un texto aquí para basar los ejercicios en él. Si lo dejas en blanco, usaremos el Tema que definas abajo.',
        or: 'o',
        uploadFile: 'Subir Archivo (.txt, .pdf, .docx, .png, .jpg)',
        configuration: 'Configuración',
        docType: 'Tipo de Documento',
        worksheet: 'Hoja de Práctica',
        exam: 'Examen',
        language: 'Idioma',
        subject: 'Materia',
        topic: 'Tema',
        topicHelp: '(Si no se proporciona contenido)',
        mathPlaceholder: 'ej. Álgebra básica',
        readingPlaceholder: 'ej. El sistema solar',
        grade: 'Grado',
        difficulty: 'Dificultad',
        questionType: 'Tipo de Pregunta',
        quantity: 'Cantidad',
        includeAnswers: 'Incluir Clave de Respuestas',
        showJson: 'Mostrar salida JSON',
        generate: 'Generar',
        generating: 'Generando...',
        freeRemaining: 'gratis restantes',
        upgradeToGenerate: 'Actualizar para Generar',
        alertTopic: 'Por favor, introduce un tema o proporciona contenido (pegando texto o subiendo un archivo).',
        alertQuestionType: 'Por favor, selecciona al menos un tipo de ejercicio.',
        parsingFile: 'Procesando archivo...',
        clearFile: 'Quitar archivo',
        fileParseError: 'No se pudo leer el archivo. Por favor, asegúrate de que no esté corrupto y prueba de nuevo.',
        configNeededTitle: 'Configuración Requerida',
        configNeededBody: 'La generación de documentos está deshabilitada. Por favor, define la URL del proxy de Gemini en el archivo \'config.js\' para continuar.',
    },
    'Inglés': {
        title: 'Create Your Document',
        teacherName: 'Teacher Name',
        schoolName: 'School Name',
        optional: '(Optional)',
        contentSource: 'Content Source',
        pasteContent: 'Specific Content (Optional)',
        pastePlaceholder: 'Paste text here to base the exercises on it. If you leave this blank, we will use the Topic you define below.',
        or: 'or',
        uploadFile: 'Upload File (.txt, .pdf, .docx, .png, .jpg)',
        configuration: 'Configuration',
        docType: 'Document Type',
        worksheet: 'Worksheet',
        exam: 'Exam',
        language: 'Language',
        subject: 'Subject',
        topic: 'Topic',
        topicHelp: '(If no content provided)',
        mathPlaceholder: 'e.g. Basic Algebra',
        readingPlaceholder: 'e.g. The Solar System',
        grade: 'Grade',
        difficulty: 'Difficulty',
        questionType: 'Question Type',
        quantity: 'Quantity',
        includeAnswers: 'Include Answer Key',
        showJson: 'Show raw JSON output',
        generate: 'Generate',
        generating: 'Generating...',
        freeRemaining: 'free remaining',
        upgradeToGenerate: 'Upgrade to Generate',
        alertTopic: 'Please enter a topic or provide content (by pasting text or uploading a file).',
        alertQuestionType: 'Please select at least one exercise type.',
        parsingFile: 'Processing file...',
        clearFile: 'Clear file',
        fileParseError: 'Could not read the file. Please ensure it is not corrupt and try again.',
        configNeededTitle: 'Configuration Required',
        configNeededBody: 'Document generation is disabled. Please set the Gemini proxy URL in the \'config.js\' file to continue.',
    }
};

const formElementClasses = "mt-1 block w-full text-base bg-slate-200/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500";
const labelClasses = "block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1";


export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isLoading, isPro, remainingGenerations }) => {
  const [formState, setFormState] = useState<FormState>({
    language: LANGUAGES[0],
    grade: GRADES[6], // Default to 7th grade
    difficulty: DIFFICULTIES[1], // Default to Intermediate
    subject: SUBJECTS[0], // Default to Reading Comprehension
    topic: '',
    includeAnswers: true,
    showJson: false,
    questionTypes: ['multiple-choice'], // Default to Multiple Choice
    questionCount: EXERCISE_COUNTS[1], // Default to 10
    userContent: '',
    userFile: null,
    documentType: 'worksheet',
    teacherName: '',
    schoolName: '',
  });

  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const T = useMemo(() => uiText[formState.language === 'Inglés' ? 'Inglés' : 'Español'], [formState.language]);
  const questionTypeOptions = useMemo(() => getQuestionTypeOptions(formState.language), [formState.language]);
  const isGeminiConfigured = useMemo(() => config.geminiProxyUrl && !config.geminiProxyUrl.startsWith('URL_DE_TU'), []);

  const handleClearFile = () => {
    setFormState(prevState => ({ ...prevState, userContent: '', userFile: null }));
    setUploadedFileName(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox' && name !== 'includeAnswers' && name !== 'showJson') {
        return;
    }

    if (name === 'userContent') {
      if(uploadedFileName) handleClearFile();
    }
    
    const target = e.target as HTMLInputElement;
    if (type === 'checkbox') {
        setFormState(prevState => ({
            ...prevState,
            [name]: target.checked,
        }));
    } else if (name === 'questionCount') {
        setFormState(prevState => ({
            ...prevState,
            [name]: parseInt(value, 10),
        }));
    } else {
        setFormState(prevState => ({
            ...prevState,
            [name]: value,
        }));
    }
  };

  const handleQuestionTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const typeValue = value as QuestionType;

    setFormState(prevState => {
      const currentTypes = prevState.questionTypes;
      const newTypes = checked
        ? [...currentTypes, typeValue]
        : currentTypes.filter(t => t !== typeValue);
      return { ...prevState, questionTypes: newTypes };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleClearFile();
    setIsParsingFile(true);
    setUploadedFileName(file.name);

    try {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                const [header, base64Data] = dataUrl.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
                const userFile: UserFile = { name: file.name, mimeType, data: base64Data, preview: dataUrl };
                setFormState(prevState => ({ ...prevState, userFile, userContent: '' }));
                setIsParsingFile(false);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'text/plain') {
            const text = await file.text();
            setFormState(prevState => ({ ...prevState, userContent: text, userFile: null }));
            setIsParsingFile(false);
        } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await extractRawText({ arrayBuffer });
            setFormState(prevState => ({ ...prevState, userContent: result.value, userFile: null }));
            setIsParsingFile(false);
        } else if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n';
            }
            setFormState(prevState => ({ ...prevState, userContent: fullText, userFile: null }));
            setIsParsingFile(false);
        } else {
            // Unsupported file type, but try to read as text as a fallback.
            const text = await file.text();
            setFormState(prevState => ({ ...prevState, userContent: text, userFile: null }));
            setIsParsingFile(false);
        }
    } catch (error) {
        console.error("Error parsing file:", error);
        alert(T.fileParseError);
        handleClearFile();
        setIsParsingFile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formState.subject !== 'Comprensión de Lectura' && !formState.topic.trim() && !formState.userContent.trim() && !formState.userFile) {
      alert(T.alertTopic);
      return;
    }
    if (formState.questionTypes.length === 0) {
      alert(T.alertQuestionType);
      return;
    }
    onGenerate(formState);
  };
  
  const showFileStatus = isParsingFile || uploadedFileName;

  const generateButtonText = () => {
    if (isLoading) return T.generating;
    
    const baseText = T.generate;
    if (isPro) return baseText;
    
    if (remainingGenerations > 0) {
      return `${baseText} (${remainingGenerations} ${T.freeRemaining})`;
    } else {
      return T.upgradeToGenerate;
    }
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{T.title}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <fieldset className="space-y-4">
            <div>
              <label htmlFor="teacherName" className={labelClasses}>{T.teacherName} <span className="text-slate-500">{T.optional}</span></label>
              <input type="text" id="teacherName" name="teacherName" value={formState.teacherName} onChange={handleChange} className={formElementClasses} />
            </div>
            <div>
              <label htmlFor="schoolName" className={labelClasses}>{T.schoolName} <span className="text-slate-500">{T.optional}</span></label>
              <input type="text" id="schoolName" name="schoolName" value={formState.schoolName} onChange={handleChange} className={formElementClasses} />
            </div>
        </fieldset>

        <fieldset className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
            <legend className="text-base font-semibold leading-6 text-slate-900 dark:text-white -mt-9 mb-3 bg-slate-100 dark:bg-slate-800 px-2">{T.contentSource}</legend>
            <div>
                <label htmlFor="userContent" className={labelClasses}>{T.pasteContent}</label>
                <textarea id="userContent" name="userContent" rows={5} value={formState.userContent} onChange={handleChange} placeholder={T.pastePlaceholder} className={formElementClasses}></textarea>
            </div>
            <div className="text-center text-sm text-slate-500">{T.or}</div>
            <div>
                <label htmlFor="file-upload" className={labelClasses}>{T.uploadFile}</label>
                <input id="file-upload" name="file-upload" type="file" accept=".txt,.pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={handleFileChange} disabled={isParsingFile} className="mt-1 block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 dark:hover:file:bg-blue-900 disabled:opacity-50 disabled:cursor-wait" />
            </div>
            {showFileStatus && (
              <div className="mt-4 p-3 rounded-lg bg-slate-200 dark:bg-slate-900/50">
                {isParsingFile ? (
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 gap-3">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>{T.parsingFile}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {formState.userFile ? (
                        <img src={formState.userFile.preview} alt="preview" className="w-11 h-11 rounded-md object-cover flex-shrink-0"/>
                      ) : (
                        <div className="flex-shrink-0 h-11 w-11 flex items-center justify-center bg-slate-300 dark:bg-slate-700 rounded-lg">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                      )}
                      <div className="text-sm truncate">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={uploadedFileName ?? ''}>{uploadedFileName}</p>
                          <p className="text-slate-500">{formState.userFile ? formState.userFile.mimeType : (T.language === 'Inglés' ? 'Text content' : 'Contenido de texto')}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleClearFile} className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0 ml-4">{T.clearFile}</button>
                  </div>
                )}
              </div>
            )}
        </fieldset>
        
        <fieldset className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
            <legend className="text-base font-semibold leading-6 text-slate-900 dark:text-white -mt-9 mb-3 bg-slate-100 dark:bg-slate-800 px-2">{T.configuration}</legend>
            
            <div>
              <label className={labelClasses + ' mb-2'}>{T.docType}</label>
              <div className="flex gap-1 rounded-md bg-slate-200/60 dark:bg-slate-900 p-1">
                  <button type="button" onClick={() => setFormState(s => ({...s, documentType: 'worksheet'}))} className={`w-1/2 rounded-md py-1.5 text-sm font-medium transition-colors ${formState.documentType === 'worksheet' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>{T.worksheet}</button>
                  <button type="button" onClick={() => setFormState(s => ({...s, documentType: 'exam'}))} className={`w-1/2 rounded-md py-1.5 text-sm font-medium transition-colors ${formState.documentType === 'exam' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>{T.exam}</button>
              </div>
            </div>
            
            <div>
              <label htmlFor="language" className={labelClasses}>{T.language}</label>
              <select id="language" name="language" value={formState.language} onChange={handleChange} className={formElementClasses}>
                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="subject" className={labelClasses}>{T.subject}</label>
              <select id="subject" name="subject" value={formState.subject} onChange={handleChange} className={formElementClasses}>
                {SUBJECTS.map(subj => <option key={subj} value={subj}>{subj}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="topic" className={labelClasses}>
                {T.topic} <span className="text-slate-500 text-xs ml-1">{T.topicHelp}</span>
              </label>
              <input type="text" id="topic" name="topic" value={formState.topic} onChange={handleChange} placeholder={formState.subject === 'Matemáticas' ? T.mathPlaceholder : T.readingPlaceholder} className={formElementClasses} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="grade" className={labelClasses}>{T.grade}</label>
                  <select id="grade" name="grade" value={formState.grade} onChange={handleChange} className={formElementClasses}>
                    {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="difficulty" className={labelClasses}>{T.difficulty}</label>
                  <select id="difficulty" name="difficulty" value={formState.difficulty} onChange={handleChange} className={formElementClasses}>
                    {DIFFICULTIES.map(diff => <option key={diff} value={diff}>{diff}</option>)}
                  </select>
                </div>
            </div>

            <div>
              <label className={labelClasses}>{T.questionType}</label>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                {questionTypeOptions.map(opt => (
                  <div key={opt.value} className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`question-type-${opt.value}`}
                        name="questionTypes"
                        type="checkbox"
                        value={opt.value}
                        checked={formState.questionTypes.includes(opt.value)}
                        onChange={handleQuestionTypeChange}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={`question-type-${opt.value}`} className="font-medium text-slate-700 dark:text-slate-300">{opt.label}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="questionCount" className={labelClasses}>{T.quantity}</label>
              <select id="questionCount" name="questionCount" value={formState.questionCount} onChange={handleChange} className={formElementClasses}>
                {EXERCISE_COUNTS.map(count => <option key={count} value={count}>{count}</option>)}
              </select>
            </div>
            
            <div className="space-y-4 pt-2">
                <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="includeAnswers" name="includeAnswers" type="checkbox" checked={formState.includeAnswers} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 rounded"/>
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="includeAnswers" className="font-medium text-slate-700 dark:text-slate-300">{T.includeAnswers}</label>
                    </div>
                </div>
                <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="showJson" name="showJson" type="checkbox" checked={formState.showJson} onChange={handleChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 rounded"/>
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="showJson" className="font-medium text-slate-700 dark:text-slate-300">{T.showJson}</label>
                    </div>
                </div>
            </div>
        </fieldset>

        {!isGeminiConfigured && (
          <div className="bg-orange-100 dark:bg-orange-900/50 border-l-4 border-orange-500 text-orange-800 dark:text-orange-300 p-4 rounded-r-lg" role="alert">
            <p className="font-bold">{T.configNeededTitle}</p>
            <p className="text-sm mt-1">{T.configNeededBody}</p>
          </div>
        )}

        <div>
          <button type="submit" disabled={isLoading || !isGeminiConfigured} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
            {isGeminiConfigured ? generateButtonText() : T.configNeededTitle}
          </button>
        </div>
      </form>
    </div>
  );
};