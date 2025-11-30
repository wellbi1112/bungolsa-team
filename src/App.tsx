import React, { useState } from "react";
import "./App.css";

type Player = {
  id: number;
  name: string;
  handicap?: number;
};

type Team = Player[];

type Mode = "random" | "balanced";

function parsePlayers(text: string): Player[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, idx) => {
    const [nameRaw, handicapRaw] = line.split(",").map((p) => p?.trim());
    const name = nameRaw || `참가자${idx + 1}`;
    const handicap =
      handicapRaw && !Number.isNaN(Number(handicapRaw))
        ? Number(handicapRaw)
        : undefined;

    return {
      id: idx + 1,
      name,
      handicap,
    };
  });
}

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.v);
}

function makeRandomTeams(players: Player[], teamSize: number): Team[] {
  const shuffled = shuffle(players);
  const teams: Team[] = [];

  for (let i = 0; i < shuffled.length; i += teamSize) {
    teams.push(shuffled.slice(i, i + teamSize));
  }

  // 남는 인원 보정: 가장 앞 팀부터 한 명씩 추가
  const total = players.length;
  const idealTeamsCount = Math.ceil(total / teamSize);

  if (teams.length > idealTeamsCount) {
    const lastTeam = teams.pop();
    if (lastTeam) {
      let idx = 0;
      lastTeam.forEach((p) => {
        teams[idx % teams.length].push(p);
        idx++;
      });
    }
  }

  return teams;
}

function makeBalancedTeams(players: Player[], teamSize: number): Team[] {
  // handicap이 있는 사람 기준으로 정렬 (낮을수록 잘침)
  const sorted = [...players].sort((a, b) => {
    const ha = a.handicap ?? 999;
    const hb = b.handicap ?? 999;
    return ha - hb;
  });

  const teamCount = Math.ceil(players.length / teamSize);
  const teams: Team[] = Array.from({ length: teamCount }, () => []);

  // 스네이크 방식 배치
  let index = 0;
  let direction = 1; // 1: 0→N-1, -1: N-1→0

  while (index < sorted.length) {
    if (direction === 1) {
      for (let t = 0; t < teamCount && index < sorted.length; t++) {
        teams[t].push(sorted[index++]);
      }
    } else {
      for (let t = teamCount - 1; t >= 0 && index < sorted.length; t--) {
        teams[t].push(sorted[index++]);
      }
    }
    direction *= -1;
  }

  return teams;
}

function calcAverageHandicap(team: Team): number | null {
  const hs = team
    .map((p) => p.handicap)
    .filter((h): h is number => typeof h === "number");

  if (!hs.length) return null;
  const sum = hs.reduce((a, b) => a + b, 0);
  return sum / hs.length;
}

const App: React.FC = () => {
  const [playersInput, setPlayersInput] = useState<string>(
`김철수,18
박영희,25
이민수,10
정우성,15
한지민,22`
  );
  const [teamSize, setTeamSize] = useState<number>(3);
  const [mode, setMode] = useState<Mode>("random");
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMakeTeams = () => {
    const players = parsePlayers(playersInput);

    if (!players.length) {
      setError("참가자를 한 명 이상 입력해주세요.");
      setTeams(null);
      return;
    }

    if (teamSize <= 0) {
      setError("팀당 인원을 1명 이상으로 설정해주세요.");
      setTeams(null);
      return;
    }

    setError(null);

    let madeTeams: Team[];
    if (mode === "balanced") {
      madeTeams = makeBalancedTeams(players, teamSize);
    } else {
      madeTeams = makeRandomTeams(players, teamSize);
    }

    setTeams(madeTeams);
  };

  const handleReset = () => {
    setTeams(null);
    setError(null);
  };

  const totalPlayers = teams?.reduce((acc, t) => acc + t.length, 0) ?? 0;

  return (
    <div className="app">
      <header className="header">
        <h1>분골사 팀편성</h1>
        <p className="subtitle">
          스크린골프 방·팀 나누기, 이제 추첨기로 간단하게 끝내세요.
        </p>
      </header>

      <main>
        <section className="card">
          <h2>참가자 입력</h2>
          <p className="description">
            한 줄에 한 명씩 입력해주세요.{" "}
            <span className="hint">이름,핸디캡</span> 형식도 지원합니다.
            <br />
            예) <code>김철수,18</code>
          </p>
          <textarea
            value={playersInput}
            onChange={(e) => setPlayersInput(e.target.value)}
            rows={8}
          />
        </section>

        <section className="card">
          <h2>방/팀 설정</h2>
          <div className="form-row">
            <label>팀당 인원</label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
            >
              <option value={2}>2명</option>
              <option value={3}>3명</option>
              <option value={4}>4명</option>
              <option value={5}>5명</option>
            </select>
          </div>

          <div className="form-row">
            <label>편성 방식</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="random"
                  checked={mode === "random"}
                  onChange={() => setMode("random")}
                />
                랜덤 배정
              </label>
              <label>
                <input
                  type="radio"
                  value="balanced"
                  checked={mode === "balanced"}
                  onChange={() => setMode("balanced")}
                />
                실력 균등 (핸디캡 기준)
              </label>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="button-row">
            <button className="primary" onClick={handleMakeTeams}>
              방/팀 추첨하기
            </button>
            {teams && (
              <button className="secondary" onClick={handleReset}>
                초기화
              </button>
            )}
          </div>
        </section>

        {teams && (
          <section className="card">
            <h2>추첨 결과</h2>
            <p className="summary">
              총 <strong>{totalPlayers}</strong>명,{" "}
              <strong>{teams.length}</strong>개 방/팀으로 추첨되었습니다.
            </p>

            <div className="teams-grid">
              {teams.map((team, idx) => {
                const avg = calcAverageHandicap(team);
                return (
                  <div key={idx} className="team-card">
                    <div className="team-header">
                      <span className="team-name">방/팀 {idx + 1}</span>
                      {avg !== null && (
                        <span className="team-meta">
                          평균 핸디캡 {avg.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <ul className="player-list">
                      {team.map((p) => (
                        <li key={p.id}>
                          {p.name}
                          {p.handicap != null && (
                            <span className="handicap">
                              (HCP {p.handicap})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} 분골사 팀편성</span>
      </footer>
    </div>
  );
};

export default App;
