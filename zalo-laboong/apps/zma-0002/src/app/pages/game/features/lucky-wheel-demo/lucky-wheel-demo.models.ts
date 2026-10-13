export type MiniGameCampaignStatus =
  | 'not_started'
  | 'active'
  | 'paused'
  | 'ended'
  | 'sold_out'
  | 'out_of_spin'
  | 'ineligible';

export type MiniGameRewardType = 'voucher' | 'physical_gift' | 'points' | 'product' | 'no_reward';

export type MiniGameRewardStatus = 'issued' | 'pending' | 'none';

export interface MiniGameAsset {
  url: string | null;
  width?: number;
  height?: number;
  fallback?: string;
}

export interface MiniGameSegment {
  segmentId: string;
  segmentIndex: number;
  rewardId: string;
  label: string;
  color: string;
  textColor?: string;
  imageUrl?: string | null;
}

export interface MiniGameReward {
  rewardId: string;
  type: MiniGameRewardType;
  label: string;
  voucherCode?: string;
  imageUrl?: string | null;
  message: string;
  claimRequired: boolean;
  status: MiniGameRewardStatus;
}

export interface MiniGameInfo {
  campaignId: string;
  name: string;
  status: MiniGameCampaignStatus;
  remainingSpins: number;
  assets: {
    background: MiniGameAsset;
    wheelFrame: MiniGameAsset;
    pointer: MiniGameAsset;
    spinButton: MiniGameAsset;
    resultPopupBg: MiniGameAsset;
  };
  segments: MiniGameSegment[];
  rules: string;
  lastRewards: MiniGameReward[];
}

export interface MiniGameSpinResult {
  spinId: string;
  campaignId: string;
  rewardId: string;
  segmentId: string;
  segmentIndex: number;
  remainingSpins: number;
  reward: MiniGameReward;
}
