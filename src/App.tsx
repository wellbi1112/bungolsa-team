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
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState<string>("");
  const [newHandicap, setNewHandicap] = useState<string>("");

  const [teamSize, setTeamSize] = useState<number>(3);
  const [mode, setMode] = useState<Mode>("random");

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const totalPlayers = teams?.reduce((acc, t) => acc + t.length, 0) ?? 0;

  const addPlayer = () => {
    if (!newName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    const handicapValue =
      newHandicap.trim() !== "" && !Number.isNaN(Number(newHandicap))
        ? Number(newHandicap)
        : undefined;

    const newPlayer: Player = {
      id: players.length > 0 ? players[players.length - 1].id + 1 : 1,
      name: newName.trim(),
      handicap: handicapValue,
    };

    setPlayers([...players, newPlayer]);
    setNewName("");
    setNewHandicap("");
    setError(null);
  };

  const removePlayer = (id: number) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const handleMakeTeams = () => {
    if (players.length === 0) {
      setError("최소 1명 이상의 참가자를 추가해주세요.");
      return;
    }

    let result: Team[];

    if (mode === "balanced") result = makeBalancedTeams(players, teamSize);
    else result = makeRandomTeams(players, teamSize);

    setTeams(result);
    setTeamNames(generateTeamNames(result.length));
    setError(null);
    setCopyMessage(null);
  };

  const handleReset = () => {
    setTeams(null);
    setTeamNames([]);
    setCopyMessage(null);
  };

  const handleCopyResults = async () => {
    if (!teams) return;

    const lines: string[] = [];
    lines.push("[분골사 팀편성 요정 결과]");
    lines.push(`총 ${totalPlayers}명, ${teams.length}개 방/팀`);
    lines.push("");

    teams.forEach((team, idx) => {
      const name = teamNames[idx];
      const avg = calcAverageHandicap(team);
      const avgText = avg !== null ? ` (평균 HCP ${avg.toFixed(1)})` : "";

      lines.push(`■ ${name}${avgText}`);
      lines.push(
        team
          .map((p) =>
            p.handicap != null ? `${p.name}(HCP ${p.handicap})` : p.name
          )
          .join(", ")
      );
      lines.push("");
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("복사 완료! 카카오톡에 붙여넣기 해주세요.");
    } catch (err) {
      setCopyMessage("자동 복사가 지원되지 않습니다. 직접 복사해주세요.");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>분골사 팀편성 요정</h1>
        <p className="subtitle">
          스크린골프 방·팀 편성, 이제 10초 만에 끝내세요.
          <br />이름과 핸디캡만 입력하면 분골사 요정이 대신 짜드립니다.
        </p>
      </header>

      <main>
        <section className="card">
          <h2>참가자 추가</h2>
          <p className="description">이름과 핸디캡을 입력한 후 + 버튼을 눌러주세요.</p>

          <div className="player-input-row">
            <input
              type="text"
              placeholder="예: 그린"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="number"
              placeholder="예: 10"
              value={newHandicap}
              onChange={(e) => setNewHandicap(e.target.value)}
            />

            <button className="add-icon-btn" onClick={addPlayer}>
              +
            </button>
          </div>

          <ul className="player-list">
            {players.map((p) => (
              <li key={p.id}>
                <span>
                  {p.name}
                  {p.handicap != null && (
                    <span className="handicap"> (HCP {p.handicap})</span>
                  )}
                </span>
                <button className="ghost-button" onClick={() => removePlayer(p.id)}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
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
                  checked={mode === "random"}
                  onChange={() => setMode("random")}
                />
                랜덤 배정
              </label>

              <label>
                <input
                  type="radio"
                  checked={mode === "balanced"}
                  onChange={() => setMode("balanced")}
                />
                실력 균등
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
              총 {totalPlayers}명, {teams.length}개 방/팀
            </p>

            <button className="secondary fullwidth" onClick={handleCopyResults}>
              결과 복사하기
            </button>

            {copyMessage && <p className="copy-message">{copyMessage}</p>}

            <div className="teams-grid">
              {teams.map((team, idx) => (
                <div key={idx} className="team-card">
                  <div className="team-header">
                    <strong className="team-name">{teamNames[idx]}</strong>
                    <span className="team-meta">
                      {calcAverageHandicap(team)?.toFixed(1) ?? "-"}
                    </span>
                  </div>

                  <ul className="player-list">
                    {team.map((p) => (
                      <li key={p.id}>
                        {p.name}
                        {p.handicap != null && (
                          <span className="handicap"> (HCP {p.handicap})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} 분골사 팀편성 요정 by 발걸음
      </footer>
    </div>
  );
};

export default App;
