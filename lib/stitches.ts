export type StitchDef = {
  name: string;
  desc: string;
};

export const STITCHES: StitchDef[] = [
  {
    name: 'Láncszem',
    desc: 'Minden alap. Egyszerű hurok áthúzva — alaplánchoz és fordulólánchoz használják.',
  },
  {
    name: 'Varázsgyűrű',
    desc: 'Körös kezdés: fonalból hurkot képzel, és közvetlenül abba horgolsz, majd összehúzod.',
  },
  {
    name: 'Rövidpálca',
    desc: 'A legalacsonyabb öltés. Beakasztás, hurok felhúzása, majd mindkét hurkon áthúzás egyszerre.',
  },
  {
    name: 'Félpálca',
    desc: 'A rövidpálca és a magaspálca között. Átvetés, beakasztás, hurok felhúzása, majd mind a 3 hurkon áthúzás egyszerre.',
  },
  {
    name: 'Magas pálca',
    desc: 'Az alap öltés. Átvetés, beakasztás, hurok felhúzása, majd 2-2 hurkon áthúzás kétszer (2 lépés).',
  },
  {
    name: 'Hármas pálca',
    desc: 'Beakasztás előtt kétszer átvetsz. Magasabb a magaspálcánál — csipkés mintákhoz remek.',
  },
  {
    name: 'Szaporítás',
    desc: 'Ugyanabba az öltésbe 2 (vagy több) öltést dolgozol — növeli az öltésszámot.',
  },
  {
    name: 'Fogyasztás',
    desc: 'Két szomszédos öltést egybe fogsz össze — csökkenti az öltésszámot (amigurumiban gyakori).',
  },
  {
    name: 'Ráköltés',
    desc: 'Visszafelé (jobbról balra) dolgozott rövid pálca. Szép, szilárd, csavart szegélyt ad.',
  },
  {
    name: 'Popcorn öltés',
    desc: 'Egy öltésbe 5 magaspálcát dolgozol, majd összefogod — domború, buborékszerű mintát ad.',
  },
  {
    name: 'Levél öltés',
    desc: 'Ovális levél motívum, általában 5-7 magaspálcából felépítve.',
  },
  {
    name: 'Fordulólánc',
    desc: 'A sor végén láncszemek a következő sor magasságának megfelelően. 1 rövidpálcához, 2 félmagashoz, 3 magaspálcához.',
  },
  {
    name: 'Kúszószem',
    desc: 'Hamispálca — Körök zárásához vagy új pozícióba lépéshez használják.',
  },
    {
    name: 'Emelés',
    desc: 'Egy láncszemnyi emelés',
  }
];
