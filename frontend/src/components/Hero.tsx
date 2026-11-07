import { MouseEvent, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Các từ khóa bay lơ lửng; bấm vào là tìm luôn
const WORDS = [
  { t: 'Giải tích', x: 58, y: 8, tone: 0, dur: 7 },
  { t: 'Đề thi', x: 84, y: 10, tone: 1, dur: 8 },
  { t: 'Cấu trúc dữ liệu', x: 60, y: 26, tone: 3, dur: 9 },
  { t: 'Mạng máy tính', x: 80, y: 28, tone: 1, dur: 10 },
  { t: 'Slide bài giảng', x: 72, y: 44, tone: 2, dur: 6.5 },
  { t: 'Cơ sở dữ liệu', x: 56, y: 58, tone: 0, dur: 8.5 },
  { t: 'PDF', x: 88, y: 58, tone: 1, dur: 7.5 },
  { t: 'Tiếng Anh', x: 66, y: 70, tone: 2, dur: 9.5 },
  { t: 'Kinh tế vi mô', x: 80, y: 82, tone: 3, dur: 7 },
  { t: 'Ôn tập', x: 56, y: 86, tone: 0, dur: 8 },
];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const nav = useNavigate();
  const { user } = useAuth();

  // Vệt sáng đi theo con trỏ chuột
  const onMove = (e: MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <section ref={ref} onMouseMove={onMove} className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-surface px-6 py-10 sm:px-10 sm:py-14">
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative z-10 max-w-md">
        <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">Học cùng nhau, tìm tài liệu trong vài giây.</h1>
        <p className="mt-4 text-muted">Đề thi, slide, giáo trình do sinh viên chia sẻ và được kiểm duyệt. Đăng tài liệu của bạn để nhận điểm uy tín.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={user ? '/upload' : '/register'} className="btn-primary px-5 py-2.5">{user ? 'Đăng tài liệu' : 'Tham gia ngay'}</Link>
          <a href="#kho-tai-lieu" className="btn-outline px-5 py-2.5">Xem kho tài liệu</a>
        </div>
      </div>

      <div className="absolute inset-0 hidden xl:block" aria-hidden="true">
        {WORDS.map((w, i) => (
          <div key={w.t} className="float-word" style={{ left: `${w.x}%`, top: `${w.y}%`, animationDuration: `${w.dur}s`, animationDelay: `${-i * 0.9}s` }}>
            <button tabIndex={-1} className={`fw-btn fw-${w.tone} ${i % 3 === 0 ? 'text-base' : 'text-sm'}`} onClick={() => nav(`/?q=${encodeURIComponent(w.t)}`)}>
              {w.t}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
