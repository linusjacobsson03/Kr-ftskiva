export interface PendingAssignment {
  id: number;
  challenge_id: number;
  title: string;
  description: string;
  points: number;
  emoji: string;
  duration_seconds: number;
  deadline: string;
  deadlineIso: string;
  status: "pending";
}

export interface HistoryAssignment {
  id: number;
  challenge_id: number;
  title: string;
  emoji: string;
  challenge_points: number;
  status: "completed" | "expired";
  points_awarded: number;
  completed_at: string | null;
}

export interface Submission {
  id: number;
  photo_data: string;
  completed_at: string;
  points_awarded: number;
  title: string;
  emoji: string;
  display_name: string;
  avatar_emoji: string;
}

export interface LeaderboardEntry {
  id: number;
  display_name: string;
  avatar_emoji: string;
  points: number;
  challenges_completed: number;
}

export interface PhotoItem {
  id: number;
  user_id: number;
  caption: string;
  image_data: string;
  created_at: string;
  display_name: string;
  avatar_emoji: string;
}

export interface ChallengeTemplate {
  id: number;
  title: string;
  description: string;
  points: number;
  duration_seconds: number;
  emoji: string;
  created_at: string;
  times_sent: number;
  active_count: number;
}
