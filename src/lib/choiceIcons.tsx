import {
  BoltIcon,
  BusIcon,
  CameraIcon,
  CarIcon,
  CoffeeIcon,
  FemaleIcon,
  ForkIcon,
  GenderAnyIcon,
  LeafIcon,
  MaleIcon,
  MuseumIcon,
  RocketIcon,
  ScaleIcon,
  SofaIcon,
  WalkIcon,
} from '@/components/Icons';
import type { ReactNode } from 'react';

/**
 * 선택 칸(여행 속도 · 이동 수단 · 테마 · 성별) 앞에 붙는 장식용 아이콘 (값 → 아이콘).
 * 여행 생성 · 매칭 · 매칭 설정 화면이 같은 아이콘을 쓰도록 한 곳에 모았다. 없는 값은 글자만 보여준다.
 */
export const CHOICE_ICONS: Record<string, ReactNode> = {
  RELAXED: <CoffeeIcon size={16} />,
  BALANCED: <ScaleIcon size={16} />,
  PACKED: <RocketIcon size={16} />,
  WALK: <WalkIcon size={16} />,
  CAR: <CarIcon size={16} />,
  PUBLIC_TRANSPORT: <BusIcon size={16} />,
  NATURE: <LeafIcon size={16} />,
  FOOD: <ForkIcon size={16} />,
  CULTURE: <MuseumIcon size={16} />,
  REST: <SofaIcon size={16} />,
  SNS: <CameraIcon size={16} />,
  ACTIVITY: <BoltIcon size={16} />,
  ANY: <GenderAnyIcon size={16} />,
  MALE: <MaleIcon size={16} />,
  FEMALE: <FemaleIcon size={16} />,
};
