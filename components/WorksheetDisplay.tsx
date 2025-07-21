import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Worksheet, Question, QuestionType } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

const getQuestionTypeLabel = (type: QuestionType, lang: string): string => {
    const labels: Record<string, Record<string, string>> = {
        'multiple-choice': { 'Español': 'Selección Múltiple', 'Inglés': 'Multiple Choice' },
        'true-false': { 'Español': 'Verdadero o Falso', 'Inglés': 'True or False' },
        'open-ended': { 'Español': 'Pregunta Abierta', 'Inglés': 'Open-ended' },
        'fill-in-the-blanks': { 'Español': 'Llenar Espacios', 'Inglés': 'Fill in the Blanks' },
        'matching': { 'Español': 'Pareo', 'Inglés': 'Matching' },
    };
    const defaultLabel = { 'Español': 'Pregunta', 'Inglés': 'Question' };
    const langKey = lang === 'Inglés' ? 'Inglés' : 'Español';
    return labels[type]?.[langKey] || defaultLabel[langKey];
};

const uiText = {
  name: { 'Español': 'Nombre', 'Inglés': 'Name' },
  date: { 'Español': 'Fecha', 'Inglés': 'Date' },
  teacher: { 'Español': 'Maestro(a)', 'Inglés': 'Teacher' },
  school: { 'Español': 'Escuela', 'Inglés': 'School' },
  mainActivity: { 'Español': 'Actividad Principal', 'Inglés': 'Main Activity' },
  questions: { 'Español': 'Preguntas', 'Inglés': 'Questions' },
  answerKey: { 'Español': 'Clave de Respuestas', 'Inglés': 'Answer Key' },
  placeholderTitle: { 'Español': 'Tu documento aparecerá aquí', 'Inglés': 'Your document will appear here' },
  placeholderSubtitle: { 'Español': 'Completa el formulario de la izquierda para comenzar.', 'Inglés': 'Fill out the form on the left to get started.' },
  downloading: { 'Español': 'Descargando...', 'Inglés': 'Downloading...' },
  downloadPdf: { 'Español': 'Descargar como PDF', 'Inglés': 'Download as PDF' },
  pdfError: { 'Español': 'Lo sentimos, hubo un error al crear el PDF. Por favor, inténtalo de nuevo.', 'Inglés': 'Sorry, there was an error creating the PDF. Please try again.' },
  true: { 'Español': 'Cierto', 'Inglés': 'True' },
  false: { 'Español': 'Falso', 'Inglés': 'False' },
  copy: { 'Español': 'Copiar JSON', 'Inglés': 'Copy JSON' },
  copied: { 'Español': '¡Copiado!', 'Inglés': 'Copied!' },
};

interface WorksheetDisplayProps {
  data: Worksheet | null;
  isLoading: boolean;
  showAsJson: boolean;
  language: string;
  teacherName?: string;
  schoolName?: string;
}

const QuestionCard: React.FC<{ question: Question, language: string }> = ({ question, language }) => {
  const langKey = language === 'Inglés' ? 'Inglés' : 'Español';
  return (
    <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700 last:border-b-0 break-inside-avoid">
      <p className="text-sm font-semibold text-blue-500 dark:text-blue-400 mb-2">{getQuestionTypeLabel(question.questionType, language)}</p>
      <p className="font-medium text-slate-800 dark:text-slate-200 mb-3 whitespace-pre-wrap">{question.questionNumber}. {question.questionText}</p>
      
      {question.questionType === 'multiple-choice' && question.options && (
        <ul className="space-y-2 pl-5">
          {question.options.map((option, index) => (
            <li key={index} className="flex items-center">
              <span className="mr-3 flex-shrink-0 text-slate-500 dark:text-slate-400">{String.fromCharCode(65 + index)}.</span>
              <span className="text-slate-700 dark:text-slate-300">{option}</span>
            </li>
          ))}
        </ul>
      )}

      {question.questionType === 'true-false' && (
        <div className="space-x-4 pl-5">
          <span className="text-slate-700 dark:text-slate-300">{uiText.true[langKey]}</span>
          <span className="text-slate-700 dark:text-slate-300">{uiText.false[langKey]}</span>
        </div>
      )}

      {question.questionType === 'open-ended' && (
        <div className="mt-2 pl-5">
           <div className="w-full h-24 bg-slate-100 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-md"></div>
        </div>
      )}

      {question.questionType === 'matching' && question.matchingTerms && question.matchingDefinitions && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <ul className="space-y-3">
            {question.matchingTerms.map((term) => (
              <li key={term.id} className="flex items-center">
                <span className="inline-block border border-slate-400 dark:border-slate-600 w-8 h-8 mr-4 rounded-md"></span>
                <span className="font-medium mr-2">{term.id}.</span>
                <span className="text-slate-700 dark:text-slate-300">{term.term}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-3">
            {question.matchingDefinitions.map((def) => (
              <li key={def.id} className="flex items-start">
                <span className="font-medium w-6 flex-shrink-0">{def.id}.</span>
                <span className="text-slate-700 dark:text-slate-300">{def.definition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const AnswerKey: React.FC<{ questions: Question[], language: string }> = ({ questions, language }) => {
  const langKey = language === 'Inglés' ? 'Inglés' : 'Español';
  return (
    <div className="mt-8 break-before-page">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-blue-500 pb-2">{uiText.answerKey[langKey]}</h3>
      <ol className="space-y-3">
        {questions.map(q => {
          let displayAnswer: string;
          if (q.questionType === 'matching' && typeof q.answer === 'object' && q.answer !== null && !Array.isArray(q.answer)) {
            displayAnswer = Object.entries(q.answer)
              .map(([key, value]) => `${key} - ${value}`)
              .join(', ');
          } else if (q.questionType === 'true-false') {
            displayAnswer = q.answer ? uiText.true[langKey] : uiText.false[langKey];
          } else {
            displayAnswer = String(q.answer);
          }
          
          return (
            <li key={q.questionNumber} className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{q.questionNumber}.</span> {displayAnswer}
            </li>
          )
        })}
      </ol>
    </div>
  );
};

export const WorksheetDisplay: React.FC<WorksheetDisplayProps> = ({ data, isLoading, showAsJson, language, teacherName, schoolName }) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const langKey = language === 'Inglés' ? 'Inglés' : 'Español';

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    setIsDownloading(true);

    try {
        const pdf = new jsPDF({ orientation: 'p', unit: 'in', format: 'letter' });
        const page = { width: pdf.internal.pageSize.getWidth(), height: pdf.internal.pageSize.getHeight(), margin: 0.75 };
        const printableWidth = page.width - (page.margin * 2);
        let y = page.margin;

        const checkPageBreak = (neededHeight: number) => {
            if (y + neededHeight > page.height - page.margin) {
                pdf.addPage();
                y = page.margin;
            }
        };

        // 1. Student Header
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(30, 41, 59); // slate-800
        pdf.text(`${uiText.name[langKey]}: _________________________`, page.margin, y);
        const dateText = `${uiText.date[langKey]}: ______________`;
        const dateWidth = pdf.getStringUnitWidth(dateText) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(dateText, page.width - page.margin - dateWidth, y);
        y += 0.3;

        // 2. School/Teacher Header
        pdf.setFontSize(10);
        const schoolText = schoolName ? `${uiText.school[langKey]}: ${schoolName}` : '';
        const teacherText = teacherName ? `${uiText.teacher[langKey]}: ${teacherName}` : '';
        if (schoolText) pdf.text(schoolText, page.margin, y);
        if (teacherText) {
            const teacherWidth = pdf.getStringUnitWidth(teacherText) * pdf.getFontSize() / pdf.internal.scaleFactor;
            pdf.text(teacherText, page.width - page.margin - teacherWidth, y);
        }
        if (schoolName || teacherName) {
            y += 0.25;
        }

        y += 0.2;

        // 3. Title
        pdf.setFontSize(22);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0,0,0);
        const titleLines = pdf.splitTextToSize(data.title, printableWidth);
        const titleHeight = (titleLines.length * pdf.getLineHeight()) / pdf.internal.scaleFactor;
        checkPageBreak(titleHeight);
        pdf.text(titleLines, page.width / 2, y, { align: 'center' });
        y += titleHeight + 0.3;

        // 4. Main Content
        if (data.mainContent) {
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            checkPageBreak(0.5);
            pdf.text(uiText.mainActivity[langKey], page.margin, y);
            y += 0.1;
            pdf.setLineWidth(0.01);
            pdf.line(page.margin, y, page.margin + printableWidth, y);
            y += 0.3;
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(30, 41, 59); // slate-800
            const contentLines = pdf.splitTextToSize(data.mainContent, printableWidth);
            const contentHeight = (contentLines.length * pdf.getLineHeight()) / pdf.internal.scaleFactor;
            checkPageBreak(contentHeight);
            pdf.text(contentLines, page.margin, y);
            y += contentHeight + 0.5;
        }

        // 5. Questions
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0,0,0);
        checkPageBreak(0.5);
        pdf.text(uiText.questions[langKey], page.margin, y);
        y += 0.1;
        pdf.setLineWidth(0.01);
        pdf.line(page.margin, y, page.margin + printableWidth, y);
        y += 0.3;

        for (const q of data.questions) {
            pdf.setFontSize(10);
            const typeLines = pdf.splitTextToSize(getQuestionTypeLabel(q.questionType, language), printableWidth);
            const typeHeight = (typeLines.length * pdf.getLineHeight()) / pdf.internal.scaleFactor;
            
            pdf.setFontSize(11);
            const questionLines = pdf.splitTextToSize(`${q.questionNumber}. ${q.questionText}`, printableWidth - 0.2); // small indent
            const questionHeight = (questionLines.length * pdf.getLineHeight()) / pdf.internal.scaleFactor;
            
            let optionsHeight = 0;
            if (q.questionType === 'multiple-choice' && q.options) {
                pdf.setFontSize(11);
                optionsHeight = q.options.reduce((total, option) => {
                    const lines = pdf.splitTextToSize(`${String.fromCharCode(65)}. ${option}`, printableWidth - 0.25);
                    return total + (lines.length * (pdf.getLineHeight() / pdf.internal.scaleFactor)) + 0.05;
                }, 0);
            } else if (q.questionType === 'true-false') { optionsHeight = 0.25; }
              else if (q.questionType === 'open-ended') { optionsHeight = 1; } // 1 inch for answer space
              else if (q.questionType === 'fill-in-the-blanks') { optionsHeight = 0.2; }
              else if (q.questionType === 'matching' && q.matchingTerms && q.matchingDefinitions) {
                const colWidth = (printableWidth / 2) - 0.125;
                let leftColHeight = 0;
                q.matchingTerms.forEach(term => {
                    const lines = pdf.splitTextToSize(`${term.id}. ${term.term}`, colWidth - 0.3);
                    leftColHeight += (lines.length * pdf.getLineHeight() / pdf.internal.scaleFactor) + 0.2;
                });
                let rightColHeight = 0;
                q.matchingDefinitions.forEach(def => {
                    const lines = pdf.splitTextToSize(`${def.id}. ${def.definition}`, colWidth - 0.2);
                    rightColHeight += (lines.length * pdf.getLineHeight() / pdf.internal.scaleFactor) + 0.2;
                });
                optionsHeight = Math.max(leftColHeight, rightColHeight);
              }
            
            checkPageBreak(typeHeight + questionHeight + optionsHeight + 0.3);
            
            pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(37, 99, 235); // blue-600
            pdf.text(typeLines, page.margin, y);
            y += typeHeight + 0.05;
            
            pdf.setFontSize(11); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 41, 59); // slate-800
            pdf.text(questionLines, page.margin, y);
            y += questionHeight + 0.15;

            if (q.questionType === 'multiple-choice' && q.options) {
                pdf.setFontSize(11);
                for (const [index, option] of q.options.entries()) {
                    const optionLines = pdf.splitTextToSize(`${String.fromCharCode(65 + index)}. ${option}`, printableWidth - 0.25);
                    pdf.text(optionLines, page.margin + 0.25, y);
                    const optionLineHeight = (optionLines.length * pdf.getLineHeight()) / pdf.internal.scaleFactor;
                    y += optionLineHeight + 0.05;
                }
            } else if (q.questionType === 'true-false') {
                pdf.text(`${uiText.true[langKey]}      ${uiText.false[langKey]}`, page.margin + 0.25, y); y += 0.25;
            } else if (q.questionType === 'open-ended') {
                pdf.setLineDashPattern([2/72, 2/72], 0);
                pdf.setDrawColor(156, 163, 175); // slate-400
                for (let i = 0; i < 4; i++) {
                    if (y + 0.25 > page.height - page.margin) { pdf.addPage(); y = page.margin; }
                    pdf.line(page.margin, y, page.width - page.margin, y);
                    y += 0.25;
                }
                pdf.setLineDashPattern([], 0); y += 0.1;
            } else if (q.questionType === 'fill-in-the-blanks') { y += 0.2; }
            else if (q.questionType === 'matching' && q.matchingTerms && q.matchingDefinitions) {
                const colWidth = (printableWidth / 2) - 0.125;
                const leftColX = page.margin;
                const rightColX = page.margin + colWidth + 0.25;
                let leftY = y;
                let rightY = y;

                for(const term of q.matchingTerms) {
                    pdf.setDrawColor(100, 116, 139);
                    pdf.rect(leftColX, leftY - 0.1, 0.2, 0.2); // Draw a box for answer
                    const termLines = pdf.splitTextToSize(`${term.id}. ${term.term}`, colWidth - 0.3);
                    pdf.text(termLines, leftColX + 0.3, leftY);
                    leftY += (termLines.length * pdf.getLineHeight() / pdf.internal.scaleFactor) + 0.2;
                }
                for(const def of q.matchingDefinitions) {
                    const defLines = pdf.splitTextToSize(`${def.id}. ${def.definition}`, colWidth - 0.2);
                    pdf.text(defLines, rightColX, rightY);
                    rightY += (defLines.length * pdf.getLineHeight() / pdf.internal.scaleFactor) + 0.2;
                }
                y = Math.max(leftY, rightY);
            }
            
            y += 0.15;
        }

        // 6. Answer Key
        if (data.questions.some(q => q.answer !== undefined)) {
            checkPageBreak(page.height); // Force new page for answer key
            y = page.margin;
            pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0,0,0);
            pdf.text(uiText.answerKey[langKey], page.margin, y);
            y += 0.1; pdf.setLineWidth(0.01); pdf.line(page.margin, y, page.margin + printableWidth, y); y += 0.3;

            pdf.setFontSize(11); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 41, 59);
            for (const q of data.questions) {
                let answerText: string;
                if (q.questionType === 'matching' && typeof q.answer === 'object' && q.answer !== null && !Array.isArray(q.answer)) {
                  answerText = Object.entries(q.answer).map(([k,v]) => `${k} - ${v}`).join(', ');
                } else if (q.questionType === 'true-false') {
                  answerText = q.answer ? uiText.true[langKey] : uiText.false[langKey];
                } else {
                  answerText = String(q.answer);
                }
                const answerLines = pdf.splitTextToSize(`${q.questionNumber}. ${answerText}`, printableWidth);
                const answerHeight = (answerLines.length * pdf.getLineHeight()) / pdf.internal.scaleFactor;
                checkPageBreak(answerHeight + 0.1);
                pdf.text(answerLines, page.margin, y);
                y += answerHeight + 0.1;
            }
        }
        
        pdf.save(`${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'worksheet'}.pdf`);

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert(uiText.pdfError[langKey]);
    } finally {
        setIsDownloading(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-full min-h-[500px] bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      <LoadingSpinner />
    </div>
  );

  if (!data) {
    return (
      <div className="text-center p-12 bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 h-full min-h-[500px] flex flex-col justify-center items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">{uiText.placeholderTitle[langKey]}</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{uiText.placeholderSubtitle[langKey]}</p>
      </div>
    );
  }

  const copyButtonText = isCopied ? uiText.copied[langKey] : uiText.copy[langKey];
  
  return (
    <>
      <div className="flex justify-end items-center mb-4 gap-3">
        {showAsJson && (
            <div className="relative">
                <button
                  onClick={handleCopyJson}
                  disabled={isCopied}
                  className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 disabled:opacity-50 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copyButtonText}
                </button>
                 <div aria-live="polite" className="sr-only">
                    {isCopied && uiText.copied[langKey]}
                </div>
            </div>
        )}
        <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 focus:ring-green-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          {isDownloading ? uiText.downloading[langKey] : uiText.downloadPdf[langKey]}
        </button>
      </div>
      <div className="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
        <header className="mb-10 text-base font-medium text-slate-700 dark:text-slate-300 space-y-2">
            <div className="flex flex-wrap justify-between items-start gap-y-4 pt-2">
                <div className="flex items-baseline flex-1 min-w-[250px] mr-4">
                    <span className="mr-2 whitespace-nowrap">{uiText.name[langKey]}:</span>
                    <span className="w-full border-b border-slate-400 dark:border-slate-500"></span>
                </div>
                <div className="flex items-baseline min-w-[150px]">
                    <span className="mr-2 whitespace-nowrap">{uiText.date[langKey]}:</span>
                    <span className="w-full border-b border-slate-400 dark:border-slate-500"></span>
                </div>
            </div>
            {(schoolName || teacherName) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-2 pt-2 text-sm">
                  {schoolName && <div><span className='font-semibold'>{uiText.school[langKey]}:</span> {schoolName}</div>}
                  {teacherName && <div className="text-right flex-1"><span className='font-semibold'>{uiText.teacher[langKey]}:</span> {teacherName}</div>}
              </div>
            )}
        </header>

        <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-4">{data.title}</h2>
        
        {data.mainContent && (
          <div className="my-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-blue-500 pb-2">{uiText.mainActivity[langKey]}</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{data.mainContent}</p>
          </div>
        )}
        
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b-2 border-blue-500 pb-2">{uiText.questions[langKey]}</h3>
          {data.questions.map(q => <QuestionCard key={q.questionNumber} question={q} language={language} />)}
        </div>

        {data.questions.some(q => q.answer !== undefined) && <AnswerKey questions={data.questions} language={language} />}
      </div>
    </>
  );
};