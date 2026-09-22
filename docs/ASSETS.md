# Ассеты DeadlockInsight

Все пользовательские изображения планируется хранить внутри:

```
panorama/images/deadlock_insight/
```

Текст, проценты, таймеры, полосы прогресса и динамические числа не должны запекаться в изображения — их рисует Panorama.

## Планируемые пути

```
panorama/images/deadlock_insight/
├── brand/
│   ├── logo.png
│   └── mark.png
├── camps/
│   ├── easy.png
│   ├── medium.png
│   ├── hard.png
│   └── casino.png
├── objectives/
│   ├── powerup.png
│   └── mid_boss.png
├── world/
│   ├── marker_frame.png
│   └── respawn_ring.png
├── shop/
│   ├── score_badge.png
│   ├── badge_lane.png
│   ├── badge_counter.png
│   ├── badge_team.png
│   ├── badge_defense.png
│   └── badge_power_spike.png
├── analysis/
│   ├── weapon.png
│   ├── spirit.png
│   ├── melee.png
│   ├── bullet_resist.png
│   ├── spirit_resist.png
│   ├── barrier.png
│   ├── synergy.png
│   ├── counter.png
│   ├── economy.png
│   └── warning.png
└── roles/
    ├── gun.png
    ├── spirit.png
    ├── tank.png
    ├── support.png
    ├── initiator.png
    ├── assassin.png
    └── hybrid.png
```

## Требования

- PNG с alpha-каналом;
- прозрачный фон;
- без встроенного текста;
- квадратные иконки желательно отдавать мастер-файлом 512×512;
- мелкие HUD-иконки должны оставаться читаемыми после уменьшения до 16–24 px;
- одинаковая толщина линий внутри одного набора;
- состояния ready/cooldown/unknown в основном будут задаваться CSS, поэтому для каждого состояния отдельная картинка не нужна.

После получения финальных ассетов пути можно будет скорректировать без изменения логики трекеров и Recommendation Engine.
