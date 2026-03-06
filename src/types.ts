export interface Student {
  id: string;
  name: string;
  roll: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  timestamp: number;
}

export interface ClassModule {
  id: string;
  title: string;
  description: string;
  link: string;
  date: string;
  timestamp: number;
}

export interface TeamRule {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface HomeworkRecord {
  date: string; // YYYY-MM-DD
  submissions: Record<string, boolean>; // studentId -> isSubmitted
}
