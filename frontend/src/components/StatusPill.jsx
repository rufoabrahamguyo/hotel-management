import { Tag } from 'antd';
import { roomStatusColor, roomStatusLabel } from '../layout/roomStatus';
import { reservationStatusColor, reservationStatusLabel } from '../layout/reservationStatus';

const pillStyle = {
  margin: 0,
  border: 'none',
  borderRadius: 999,
  padding: '2px 12px',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  lineHeight: '20px',
  textTransform: 'uppercase',
  color: '#fff',
};

/** Solid pill status badge (uppercase white text on color). */
export function StatusPill({ color, children, style }) {
  return (
    <Tag
      color={color}
      style={{
        ...pillStyle,
        color: '#fff',
        background: color,
        borderColor: color,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export function RoomStatusPill({ status }) {
  return <StatusPill color={roomStatusColor(status)}>{roomStatusLabel(status)}</StatusPill>;
}

export function ReservationStatusPill({ status }) {
  return (
    <StatusPill color={reservationStatusColor(status)}>{reservationStatusLabel(status)}</StatusPill>
  );
}

export function AccountStatusPill({ status }) {
  const suspended = status === 'suspended';
  return (
    <StatusPill color={suspended ? '#c9444a' : '#2f8f57'}>
      {suspended ? 'Suspended' : 'Active'}
    </StatusPill>
  );
}
