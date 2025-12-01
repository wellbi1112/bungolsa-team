import React, { useState } from "react";
import "./App.css";

type Gender = "M" | "F" | "N";

type Player = {
  id: number;
  name: string;
  handicap?: number;
  gender: Gender;
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

// 🔹 성별을 고려한 랜덤 팀 편성
function makeRandomTeamsWithGender(players: Player[], teamSize: number): Team[] {
  const males = shuffle(players.filter((p) => p.gender === "M"));
  const females = shuffle(players.filter((p) => p.gender === "F"));
  const neutral = shuffle(players.filter((p) => p.gender === "N"));

  const total = players.length;
  const numTeams = Math.ceil(total / teamSize) || 1;
  const teams: Team[] = Array.from({ length: numTeams }, () => []);

  const assignGroup = (group: Player[]) => {
    let idx = 0;
    while (group.length) {
      const p = group.shift()!;
      teams[idx].push(p);
      idx = (idx + 1) % numTeams;
    }
  };

  assignGroup(males);
  assignGroup(females);
  assignGroup(neutral);

  return teams;
}

// 🔹 실력(핸디캡) 균등 편성
function makeBalancedTeams(players: Player[], teamSize: number): Team[] {
  const sorted = [...players].sort((a, b) => {
    const ha = a.handicap ?? 999;
    const hb = b.handicap ?? 999;
    return ha - hb;
  });

  const numTeams = Math.ceil(players.length / teamSize) || 1;
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
  const [newGender, setNewGender] = useState<Gender>("M");

  const [teamSize, setTeamSize] = useState<number>(3);
  const [mode, setMode] = useState<Mode>("random");

  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const totalPlayers = teams?.reduce((acc, t) => acc + t.length, 0) ?? 0;

  const addPlayer = () => {
    const name = newName.trim();
    if (!name) {
      setError("이름을 입력해주세요.");
      return;
    }

    const trimmedHandicap = newHandicap.trim();
    const handicapValue =
      trimmedHandicap !== "" && /^-?\d+$/.test(trimmedHandicap)
        ? Number(trimmedHandicap)
        : undefined;

    const newPlayer: Player = {
      id: players.length > 0 ? players[players.length - 1].id + 1 : 1,
      name,
      handicap: handicapValue,
      gender: newGender,
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

    setError(null);
    setCopyMessage(null);

    let result: Team[];

    if (mode === "balanced") {
      result = makeBalancedTeams(players, teamSize);
    } else {
      result = makeRandomTeamsWithGender(players, teamSize);
    }

    setTeams(result);
    setTeamNames(generateTeamNames(result.length));
  };

  const handleReset = () => {
    setTeams(null);
    setTeamNames([]);
    setCopyMessage(null);
  };

  const handleCopyResults = async () => {
    if (!teams) return;

    const lines: string[] = [];
    lines.push("[⛳ 분골사 팀편성 요정 결과]");
    lines.push(`총 ${totalPlayers}명, ${teams.length}개 방/팀`);
    lines.push("");

    teams.forEach((team, idx) => {
      const name = teamNames[idx];
      const avg = calcAverageHandicap(team);
      const avgText = avg !== null ? ` (평균 HCP ${avg.toFixed(1)})` : "";

      lines.push(`■ ${name}${avgText}`);
      lines.push(
        team
          .map((p) => {
            const genderLabel =
              p.gender === "M" ? "남" : p.gender === "F" ? "여" : "기타";
            const base = `${p.name}[${genderLabel}]`;
            return p.handicap != null
              ? `${base}(HCP ${p.handicap})`
              : base;
          })
          .join(", ")
      );
      lines.push("");
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("복사 완료! 카카오톡에 붙여넣기 해주세요.");
    } catch (err) {
      setCopyMessage("자동 복사가 안 되는 환경입니다. 직접 복사해주세요.");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>⛳🧚‍♀️ 분골사 팀편성 요정</h1>
        <p className="subtitle">
          스크린골프 방·팀 편성, 이제 10초 만에 끝내세요.
          <br />
          이름·핸디캡·성별만 입력하면 분골사 요정이 대신 짜드립니다.
        </p>
      </header>

      <main>
        {/* 참가자 추가 */}
        <section className="card">
          <h2>참가자 추가</h2>
          <p className="description">
            닉네임, 핸디캡(선택), 성별을 입력한 뒤 <strong>+</strong> 버튼을 눌러주세요.
          </p>

          <div className="player-input-row">
            <input
              type="text"
              placeholder="예: 닉네임을 입력해 주세요"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="-?[0-9]*"
              placeholder="핸디캡을 입력해 주세요 예: -3"
              value={newHandicap}
              onChange={(e) => setNewHandicap(e.target.value)}
            />
            <button className="add-icon-btn" onClick={addPlayer}>
              +
            </button>
          </div>

          <div className="gender-row">
            <span className="gender-label">성별</span>
            <div className="gender-options">
              <label>
                <input
                  type="radio"
                  value="M"
                  checked={newGender === "M"}
                  onChange={() => setNewGender("M")}
                />
                남
              </label>
              <label>
                <input
                  type="radio"
                  value="F"
                  checked={newGender === "F"}
                  onChange={() => setNewGender("F")}
                />
                여
              </label>
              <label>
                <input
                  type="radio"
                  value="N"
                  checked={newGender === "N"}
                  onChange={() => setNewGender("N")}
                />
                기타/선택안함
              </label>
            </div>
          </div>

          <ul className="player-list">
            {players.map((p) => {
              const genderLabel =
                p.gender === "M" ? "남" : p.gender === "F" ? "여" : "기타";
              return (
                <li key={p.id}>
                  <span>
                    <span className="gender-badge">{genderLabel}</span>{" "}
                    {p.name}
                    {p.handicap != null && (
                      <span className="handicap"> (HCP {p.handicap})</span>
                    )}
                  </span>
                  <button
                    className="ghost-button"
                    onClick={() => removePlayer(p.id)}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 팀 설정 */}
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
                랜덤 (성별도 함께 섞기)
              </label>
              <label>
                <input
                  type="radio"
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
                결과 초기화
              </button>
            )}
          </div>
        </section>

        {/* 결과 */}
        {teams && (
          <section className="card">
            <h2>추첨 결과</h2>
            <p className="summary">
              총 {totalPlayers}명, {teams.length}개 방/팀
            </p>

            <button className="secondary fullwidth" onClick={handleCopyResults}>
              결과 복사하기 (카카오톡 공유용)
            </button>
            {copyMessage && (
              <p className="copy-message">{copyMessage}</p>
            )}

            <div className="teams-grid">
              {teams.map((team, idx) => {
                const avg = calcAverageHandicap(team);
                return (
                  <div key={idx} className="team-card">
                    <div className="team-header">
                      <span className="team-name">{teamNames[idx]}</span>
                      {avg !== null && (
                        <span className="team-meta">
                          평균 HCP {avg.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <ul className="player-list">
                      {team.map((p) => {
                        const genderLabel =
                          p.gender === "M"
                            ? "남"
                            : p.gender === "F"
                            ? "여"
                            : "기타";
                        return (
                          <li key={p.id}>
                            <span className="gender-badge">{genderLabel}</span>{" "}
                            {p.name}
                            {p.handicap != null && (
                              <span className="handicap">
                                {" "}
                                (HCP {p.handicap})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
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
