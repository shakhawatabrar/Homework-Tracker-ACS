export interface Student {
  id: string;
  name: string;
  roll: string;
}

export interface HomeworkRecord {
  date: string; // YYYY-MM-DD
  submissions: Record<string, boolean>; // studentId -> isSubmitted
}
