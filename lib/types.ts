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
  user_id: number;
  photo_data: string | null;
  completed_at: string;
  points_awarded: number;
  title: string;
  emoji: string;
  display_name: string;
  is_mirrored?: number;
  is_video?: number;
}

export interface LeaderboardEntry {
  id: number;
  display_name: string;
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
  is_mirrored?: number;
  is_video?: number;
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
  scheduled_count: number;
  status: "pending" | "approved";
  suggested_time: string | null;
}

export interface UserOption {
  id: number;
  displayName: string;
}

export interface ScheduleEntry {
  id: number;
  challenge_id: number;
  challenge_title: string;
  challenge_emoji: string;
  send_at: string;
  target_type: "random" | "all" | "user";
  target_user_id: number | null;
  target_display_name: string | null;
  status: "scheduled" | "sending" | "sent" | "canceled" | "failed";
  error: string | null;
  sent_at: string | null;
}
