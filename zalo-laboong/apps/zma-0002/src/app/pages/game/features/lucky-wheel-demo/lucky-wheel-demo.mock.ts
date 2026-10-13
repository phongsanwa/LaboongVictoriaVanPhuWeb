import {MiniGameInfo, MiniGameReward, MiniGameSegment} from './lucky-wheel-demo.models';

export const MOCK_REWARDS: MiniGameReward[] = [
  {
    rewardId: 'reward_20k',
    type: 'voucher',
    label: 'Voucher 20K',
    voucherCode: 'SALE20K',
    message: 'Chúc mừng bạn nhận được voucher 20K',
    claimRequired: false,
    status: 'issued',
  },
  {
    rewardId: 'reward_50k',
    type: 'voucher',
    label: 'Voucher 50K',
    voucherCode: 'SALE50K',
    message: 'Bạn đã nhận được voucher 50K cho đơn hàng tiếp theo',
    claimRequired: false,
    status: 'issued',
  },
  {
    rewardId: 'reward_gift',
    type: 'physical_gift',
    label: 'Áo thun',
    message: 'Chúc mừng bạn nhận được áo thun từ cửa hàng',
    claimRequired: true,
    status: 'pending',
  },
  {
    rewardId: 'reward_points',
    type: 'points',
    label: '+100 điểm',
    message: 'Bạn đã nhận được 100 điểm tích lũy',
    claimRequired: false,
    status: 'issued',
  },
  {
    rewardId: 'reward_none',
    type: 'no_reward',
    label: 'May mắn',
    message: 'Rất tiếc, chúc bạn may mắn lần sau',
    claimRequired: false,
    status: 'none',
  },
];

export const MOCK_SEGMENTS_6: MiniGameSegment[] = [
  {
    segmentId: 'seg_01',
    segmentIndex: 0,
    rewardId: 'reward_20k',
    label: '20K',
    color: '#2fb47c',
    textColor: '#ffffff',
  },
  {
    segmentId: 'seg_02',
    segmentIndex: 1,
    rewardId: 'reward_none',
    label: 'May mắn',
    color: '#38a9dc',
    textColor: '#ffffff',
  },
  {
    segmentId: 'seg_03',
    segmentIndex: 2,
    rewardId: 'reward_gift',
    label: 'Áo thun',
    color: '#c83f78',
    textColor: '#ffffff',
  },
  {
    segmentId: 'seg_04',
    segmentIndex: 3,
    rewardId: 'reward_points',
    label: '+100',
    color: '#f5a623',
    textColor: '#ffffff',
  },
  {
    segmentId: 'seg_05',
    segmentIndex: 4,
    rewardId: 'reward_50k',
    label: '50K',
    color: '#f44343',
    textColor: '#ffffff',
  },
  {
    segmentId: 'seg_06',
    segmentIndex: 5,
    rewardId: 'reward_none',
    label: 'Lần sau',
    color: '#f7f2df',
    textColor: '#111111',
  },
];

export const MOCK_GAME_INFO: MiniGameInfo = {
  campaignId: 'lucky-wheel-001',
  name: 'Vòng quay may mắn',
  status: 'active',
  remainingSpins: 3,
  assets: {
    background: {url: null, width: 375, height: 812, fallback: 'default_background'},
    wheelFrame: {url: null, width: 320, height: 320, fallback: 'default_wheel'},
    pointer: {url: null, width: 48, height: 64, fallback: 'default_pointer'},
    spinButton: {url: null, fallback: 'default_spin_button'},
    resultPopupBg: {url: null, fallback: 'default_result_popup'},
  },
  segments: MOCK_SEGMENTS_6,
  rules:
    'Mỗi khách hàng có 3 lượt quay. Phần thưởng voucher được lưu vào tài khoản sau khi quay thành công. Quà vật lý cần xác nhận thông tin nhận quà.',
  lastRewards: [],
};
