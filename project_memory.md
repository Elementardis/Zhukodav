# Project Memory: Разработка программы обработки данных

## Методология баланса

### Формула расчета давления
```json
{
  "формула": "Давление = simultaneity * clickTax * colorTax",
  "simultaneity": "min(maxObjects, objectLifetime / spawnInterval)",
  "clickTax": {
    "описание": "среднее по весам типов",
    "значения": {
      "bug": 1,
      "colored": 1,
      "fat": 3,
      "fatColored": 3
    }
  },
  "colorTax": "1 + 0.15 * (N_colors - 1)",
  "ограничение": "до 3 цветов одновременно",
  "bombs": "учитываются скорее как когнитивный шум (штраф только за клик)"
}
```

## Цели по потоку уровней

```json
{
  "распределение_сложности": {
    "1-3": "онбординг (легко)",
    "4-8": "растяжка",
    "9-14": "мастерство",
    "15": "мини-пик",
    "16-18": "разгрузка",
    "19-25": "плавный рост к финалу без ям и пиков"
  }
}
```

## Примечания по когнитивной нагрузке

```json
{
  "когнитивная_нагрузка": {
    "цвета": {
      "одновременно": "2-3 цвета",
      "ограничение": "ранее спайки из 4+ цветов не допускаем"
    },
    "лейт_игра": {
      "стратегия": "растёт доля «толстых» (многокликовых) вместо чистого спама объектов"
    }
  }
}
```

## Структура данных уровня

```json
{
  "id": 1,
  "goalBugCount": 18,
  "lifeCount": 10,
  "params": {
    "maxObjects": 3,
    "spawnInterval": 480,
    "objectLifetime": 2200
  },
  "spawnWeights": {
    "bug": 1.0
  },
  "introPopup": {
    "type": "coloredBug_red",
    "descryption": "Удерживай КРАСНУЮ кнопку и нажми на КРАСНОГО жука!"
  }
}
```

## Обработка данных в программе

### Очередь объектов
```json
{
  "обработка_очереди": {
    "разделение_типов": {
      "killableTypes": ["bug", "fat", "coloredBug_*", "fatColoredBug_*"],
      "unkillableTypes": ["bomb"]
    },
    "генерация": {
      "minKillableCount": "goalBugCount * 3",
      "bombCount": "killableCount * 0.2 (20% от количества убиваемых)"
    },
    "параметры_объектов": {
      "fat": {
        "clicks": 3
      },
      "coloredBug": {
        "color": "извлекается из типа"
      }
    }
  }
}
```

### Взвешенный случайный выбор
```json
{
  "weightedRandomChoice": {
    "алгоритм": "1. Получить все ключи и их веса",
    "шаги": [
      "Вычислить сумму всех весов",
      "Сгенерировать случайное число от 0 до суммы весов",
      "Выбрать объект на основе весов"
    ]
  }
}
```

## Примеры уровней с обработкой данных

### Уровень 1 (базовый)
```json
{
  "id": 1,
  "goalBugCount": 18,
  "lifeCount": 10,
  "params": {
    "maxObjects": 3,
    "spawnInterval": 480,
    "objectLifetime": 2200
  },
  "spawnWeights": {
    "bug": 1.0
  }
}
```

### Уровень 2 (с цветными жуками)
```json
{
  "id": 2,
  "goalBugCount": 18,
  "lifeCount": 10,
  "params": {
    "maxObjects": 3,
    "spawnInterval": 470,
    "objectLifetime": 2300
  },
  "spawnWeights": {
    "bug": 0.8,
    "coloredBug_red": 0.2
  },
  "introPopup": {
    "type": "coloredBug_red",
    "descryption": "Удерживай КРАСНУЮ кнопку и нажми на КРАСНОГО жука!"
  }
}
```

### Уровень 5 (с толстыми жуками)
```json
{
  "id": 5,
  "goalBugCount": 20,
  "lifeCount": 10,
  "params": {
    "maxObjects": 4,
    "spawnInterval": 450,
    "objectLifetime": 2000
  },
  "spawnWeights": {
    "bug": 0.85,
    "fat": 0.15
  },
  "introPopup": {
    "type": "fat",
    "descryption": "Нажми на жука 3 РАЗА!"
  }
}
```

### Уровень 20 (с толстыми цветными жуками)
```json
{
  "id": 20,
  "goalBugCount": 20,
  "lifeCount": 10,
  "params": {
    "maxObjects": 4,
    "spawnInterval": 450,
    "objectLifetime": 2000
  },
  "spawnWeights": {
    "bug": 0.8,
    "fatColoredBug_red": 0.2
  },
  "introPopup": {
    "type": "fatColoredBug_red",
    "descryption": "УДЕРЖИВАЙ КРАСНУЮ кнопку и жми на КРАСНОГО жука 3 РАЗА!"
  }
}
```

## Версия системы

```json
{
  "версия": "levels.js (v2)",
  "методология": "баланс через формулу давления",
  "обработка_данных": "взвешенный случайный выбор типов объектов"
}
```


