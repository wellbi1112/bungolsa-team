import React, { useState } from "react";
import "./App.css";

type Player = {
  id: number;
  name: string;
  handicap?: number;
};

type Team = Player[];

type Mode = "random" | "balanced";

const TEAM_NAME_PRESETS = [
  "이글방",
  "버디방",
  "알바트로스방",
  "드로우방",
  "페이드방",
  "롱아이언방",
  "벙커탈출방",
  "티샷신방",
  "온그린방",
  "원온도전방",
];

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.v);
}

function generateTeamNames(count: number): string[] {
  const shuffled = shuffle(TEAM_NAME_PRESETS);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(shuffled[i] || `방/팀 ${i + 1}`);
  }
  return names;
}

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

function makeRandomTeams(players: Player[], teamSize: number): Team[] {
  const shuffled = shuffle(players);
  const teams: Team[] = [];
  for (let i = 0; i < shuffled.length; i += teamSize) {
    teams.push(shuffled.slice(i, i + teamSize));
  }
  return teams;
}

function makeBalancedTeams(players: Player[], teamSize: number): Team[] {
  const sorted = [...players].sort((a, b) => {
    const ha = a.handicap ?? 999;
    const hb = b.handicap ?? 999;
    return ha - hb;
  });

  const numTeams = Math.ceil(players.length / teamSize);
  const teams: Team[] = Array.from({ length: numTeams }, () => []);

  let index = 0;
  let direction = 1;

  while (index < sorted.length) {
    if (direction === 1) {
      for (let t = 0; t < numTeams && index < sorted.length; t++) {
        teams[t].push(sorted[index++]);
      }
    } else {
      for (let t = numTeams - 1; t >= 0 && index < sorted.length; t--) {
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
  if (hs.length === 0) return null;
  return hs.reduce((a, b) => a + b, 0) / hs.length;
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
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const totalPlayers = teams?.reduce((acc, team) => acc + team.length, 0) ?? 0;

  const handleMakeTeams = () => {
    const players = parsePlayers(playersInput);
    if (players.length === 0) {
      setError("참가자를 입력해주세요.");
      setTeams(null);
      setTeamNames([]);
      return;
    }
    if (teamSize <= 0) {
      setError("팀당 인원을 1명 이상으로 설정해주세요.");
      setTeams(null);
      setTeamNames([]);
      return;
    }
    setError(null);
    setCopyMessage(null);

    let result: Team[];
    if (mode === "balanced") {
      result = makeBalancedTeams(players, teamSize);
    } else {
      result = makeRandomTeams(players, teamSize);
    }

    setTeams(result);
    setTeamNames(generateTeamNames(result.length));
  };

  const handleReset = () => {
    setTeams(null);
    setTeamNames([]);
    setCopyMessage(null);
    setError(null);
  };

  const handleCopyResults = async () => {
    if (!teams || teams.length === 0) return;

    const lines: string[] = [];
    lines.push("[분골사 팀편성 결과]");
    lines.push(`총 ${totalPlayers}명, ${teams.length}개 방/팀`);
    lines.push("");

    teams.forEach((team, idx) => {
      const name = teamNames[idx] || `방/팀 ${idx + 1}`;
      const avg = calcAverageHandicap(team);
      lines.push(
        `■ ${name}${avg !== null ? ` (평균 HCP ${avg.toFixed(1)})` : ""}`
      );
      const members = team
        .map((p) =>
          p.handicap != null ? `${p.name}(HCP ${p.handicap})` : p.name
        )
        .join(", ");
      lines.push(members);
      lines.push("");
    });

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("결과가 복사되었습니다. 카카오톡에 붙여넣기 해주세요.");
    } catch (e) {
      setCopyMessage("자동 복사가 지원되지 않습니다. 직접 복사해주세요.");
    }

    setTimeout(() => setCopyMessage(null), 5000);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>분골사 팀편성 요정</h1>
        <p className="subtitle">
          스크린필드 방·팀 편성, 이제 10초 만에 끝내세요.
          <br />
          이름·핸디캡만 넣으면 분골사 팀편성 요정이 대신 짜드립니다.
        </p>
      </header>

      <main>
        <section className="card">
          <h2>참가자 입력</h2>
          <p className="description">
            한 줄에 한 명씩 입력해주세요.{" "}
            <span className="hint">이름,핸디캡</span> 형식도 지원합니다.
            <br />
            예) <code>김철수,18</code> / <code>박영희,25</code> / 핸디캡 모르면 이름만 적어도 됩니다.
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
                랜덤 배정 (가볍게 섞고 싶을 때)
              </label>
              <label>
                <input
                  type="radio"
                  value="balanced"
                  checked={mode === "balanced"}
                  onChange={() => setMode("balanced")}
                />
                실력 균등 (핸디캡 기준으로 비슷하게)
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

            <div className="results-actions">
              <button className="secondary fullwidth" onClick={handleCopyResults}>
                결과 복사하기 (카카오톡 공유용)
              </button>
              {copyMessage && (
                <p className="copy-message">{copyMessage}</p>
              )}
            </div>

            <div className="teams-grid">
              {teams.map((team, idx) => {
                const avg = calcAverageHandicap(team);
                const label = teamNames[idx] || `방/팀 ${idx + 1}`;
                return (
                  <div key={idx} className="team-card">
                    <div className="team-header">
                      <span className="team-name">{label}</span>
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
        <span>© {new Date().getFullYear()} 분골사 팀편성 요정</span>
      </footer>
    </div>
  );
};

export default App;
