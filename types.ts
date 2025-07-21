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

/**
 * Tipo para el usuario en la base de datos
 */
export interface DbUser {
  id: string;           // ID de Google
  email: string;        // Email del usuario
  name: string;         // Nombre completo
  picture?: string;     // URL de la imagen de perfil
  created_at: Date;     // Fecha de creación
  last_login: Date;     // Último inicio de sesión
  role: 'user' | 'admin'; // Rol del usuario
  worksheet_count: number; // Contador de documentos generados (para usuarios gratuitos)
}

/**
 * Tipo para la suscripción en la base de datos
 */
export interface DbSubscription {
  id: string;           // ID único
  user_id: string;      // ID del usuario
  status: 'active' | 'canceled' | 'expired'; // Estado de la suscripción
  stripe_customer_id?: string;    // ID del cliente en Stripe
  stripe_subscription_id?: string; // ID de la suscripción en Stripe
  created_at: Date;     // Fecha de inicio
  current_period_end?: Date; // Fecha de fin del período actual
  cancel_at_period_end: boolean; // Si se cancelará al final del período
  plan: string;         // Identificador del plan
  price_id?: string;    // ID del precio en Stripe
}

/**
 * Tipo para el registro de uso en la base de datos
 */
export interface DbUsage {
  id: string;           // ID único
  user_id: string;      // ID del usuario
  document_type: 'worksheet' | 'exam'; // Tipo de documento
  created_at: Date;     // Fecha de creación
  subject?: string;     // Materia del documento
  grade?: string;       // Grado escolar
  language?: string;    // Idioma del documento
  metadata?: Record<string, any>; // Metadatos adicionales
}

/**
 * Tipo para el estado del usuario con suscripción
 */
export interface UserWithSubscription extends UserProfile {
  subscription?: DbSubscription;
  is_pro: boolean;      // Indicador de si el usuario tiene suscripción activa
  role?: 'user' | 'admin'; // Rol del usuario
}

/**
 * Tipo para las estadísticas de uso
 */
export interface UsageStats {
  total_documents: number;
  documents_by_type: Record<string, number>;
  documents_by_month: Record<string, number>;
}

/**
 * Tipo para las métricas de suscripción
 */
export interface SubscriptionMetrics {
  total_subscribers: number;
  active_subscribers: number;
  canceled_subscribers: number;
  revenue_monthly: number;
  conversion_rate: number;
}
