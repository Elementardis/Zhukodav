// Сюжет за уникальные кусочки. Порядок массива = порядок получения, не номер сектора.
// Пример: первый новый кусочек cake_04 открывает cake_memory_01, следующий — cake_memory_02.
// id реплик сохраняются в прогрессе: при редактировании текста не меняй id.
// finale: true — финальная реплика. Если получена до остальных комплектов,
// ждёт все пять комплектов; награда и сборка не блокируются.
export const FOOD_STORIES = {
    greek_salad: [
        { id: 'greek_salad_memory_01', image: 'images/story/mascot_welcome.png', text: "Такой салат готовили ребята напротив. За оливками мы однажды полезли в соседский сад. Очень хотелось приготовить всё из свежего." },
        { id: 'greek_salad_memory_02', image: 'images/story/mascot_welcome.png', text: "Как-то ночью пошли купаться. Доставали ногами улиток. Возвращались босиком, несли обувь в руках." },
        { id: 'greek_salad_memory_03', image: 'images/story/mascot_welcome.png', text: "Ездили в другие города на фестивали. Спали на полу, утром шли смотреть выступления и выступали сами." },
        { id: 'greek_salad_memory_04', image: 'images/story/mascot_welcome.png', text: "Возвращались с конференций ночью, а утром шли на учёбу. Спасал только кофе в кафетерии и пирожок 'прощай печень'" },
        { id: 'greek_salad_memory_05', image: 'images/story/mascot_welcome.png', text: "Давно я никуда так не срывался… Всё дела-дела. Хотя бы на салат время остаётся, готовится за десять минут." },
    ],
    bundt_cake: [
        { id: 'bundt_cake_memory_01', image: 'images/story/mascot_welcome.png', text: "Мы с Гарри часто сидели на этой кухне и разговаривали часами. Вдвоём тут тесновато, но нам как-то хватало места." },
        { id: 'bundt_cake_memory_02', image: 'images/story/mascot_welcome.png', text: "Однажды делали вино у Гарри: у него был подвал. Лучшее вино в моей жизни. Я даже этикетку нарисовал 'РусАлко' назвали." },
        { id: 'bundt_cake_memory_03', image: 'images/story/mascot_welcome.png', text: "Как-то с Гарри поехали в соседний город в броездку. В ночи сидели на холме под фонарём и слушали Where Is My Mind." },
        { id: 'bundt_cake_memory_04', image: 'images/story/mascot_welcome.png', text: "Раньше можно было просто постучать к Гарри: «Пойдём пройдёмся?» Он даже не спрашивал, надолго ли. Просто шёл" },
        { id: 'bundt_cake_memory_05', image: 'images/story/mascot_welcome.png', text: "К сессиям тоже готовились вместе с Гарри. Делали перерыв на игру… Потом приходилось делать перерыв от игры" },
        { id: 'bundt_cake_memory_06', image: 'images/story/mascot_welcome.png', text: "Однажды я так наклюкался, что Гарри развязывал мне шнурки. Я пытался помогать, но, кажется, только затягивал узлы." },
        { id: 'bundt_cake_memory_07', image: 'images/story/mascot_welcome.png', text: "В последний день учёбы катались на колесе обозрения. Сверху было видно наши корпуса. Странно было думать, что больше туда не надо." },
        { id: 'bundt_cake_memory_08', image: 'images/story/mascot_welcome.png', text: "Мы с Гарри однажды всё организовали, чтобы встретиться. А я взял и сломал ногу. Встретились всё равно. Зря мы, что ли, столько договаривались?" },
        { id: 'bundt_cake_memory_09', image: 'images/story/mascot_welcome.png', text: "Я познакомился с Гарри на первом курсе. Мы оба должны были одеться в костюмы для выступления. Шутка за шуткой и вот уже подружились" },
        { id: 'bundt_cake_memory_10', image: 'images/story/mascot_welcome.png', text: "Потом Гарри переехал в другой город. Поначалу я всё порывался позвать его куда-нибудь вечером, но он бы уже не смог прийти." },
        { id: 'bundt_cake_memory_11', image: 'images/story/mascot_welcome.png', text: "В последний приезд Гарри спросил, где у меня чашки. Я даже удивился: он же всегда знал." },
        { id: 'bundt_cake_memory_12', image: 'images/story/mascot_welcome.png', text: "Сколько бы не прошло времени, я знаю, что с Гарри мы сможем общаться так будто этих лет в разлуке не было." },
    ],
    pie: [
        { id: 'pie_memory_01', image: 'images/story/mascot_welcome.png', text: "Сесилия готовила такой вишнёвый пирог. Мы всё не могли дождаться, пока он остынет. Ели горячим. Вишни падали на пол" },
        { id: 'pie_memory_02', image: 'images/story/mascot_welcome.png', text: "Однажды с Сесилией выбирали с помощью камень-ножницы-бумага: куда поедем, на чём и сколько остановок. В итоге приехали в крупный ТЦ." },
        { id: 'pie_memory_03', image: 'images/story/mascot_welcome.png', text: "Часто созванивались с Сесилией и болтали часами. О сериалах и играх, планах и переживаниях. Иногда даже орали песни." },
        { id: 'pie_memory_04', image: 'images/story/mascot_welcome.png', text: "У меня осталось много видео с Сесилией. Мы снимали разные приколы и пародии на сериалы. Опередили своё время" },
        { id: 'pie_memory_05', image: 'images/story/mascot_welcome.png', text: "Сесилия учила меня кататься на скейте. Что ж, первый урок усвоил. Падаю по всем правилам." },
        { id: 'pie_memory_06', image: 'images/story/mascot_welcome.png', text: "Летом Сесилия позвала на праздник в город. Мы обливали друг друга из фонтана  и купались в нём. Ехали обратно изрядно промокшие." },
        { id: 'pie_memory_07', image: 'images/story/mascot_welcome.png', text: "Потом стали реже созваниваться. Бывало, хотел что-нибудь рассказать, но думал: уже поздно, завтра напишу Сесилии." },
        { id: 'pie_memory_08', image: 'images/story/mascot_welcome.png', text: "Мы даже не ссорились. Просто однажды оказалось, что я уже не знаю, как у Сесилии обычно проходит день." },
        { id: 'pie_memory_09', image: 'images/story/mascot_welcome.png', text: "Те видео у меня остались. Одно даже выложил в интернет. Просмотров там немного. Есть ли хоть один от Сесилии." },
        { id: 'pie_memory_10', image: 'images/story/mascot_welcome.png', text: "Не знаю, какой пирог Сесилия печёт теперь. Может, давно другой. А этот я всё-таки попробую… Кажется, он уже остыл." },
    ],
    dressed_herring: [
        { id: 'dressed_herring_memory_01', image: 'images/story/mascot_welcome.png', text: "В детстве на праздники собиралась вся родня. Шуба всегда была на столе. Я долго думал, что без неё праздник просто не начнётся." },
        { id: 'dressed_herring_memory_02', image: 'images/story/mascot_welcome.png', text: "Доставали праздничный сервиз. По нему я понимал, что сегодня точно кто-то придёт, даже если мне ещё ничего не сказали." },
        { id: 'dressed_herring_memory_03', image: 'images/story/mascot_welcome.png', text: "Подарки прятали заранее. Я честно старался не искать. Но иногда случайно заглядывал именно туда, куда не следовало." },
        { id: 'dressed_herring_memory_04', image: 'images/story/mascot_welcome.png', text: "Пока взрослые готовили, я таскал сырые пельмени. Почему именно сырые? Меня тогда тоже спрашивали." },
        { id: 'dressed_herring_memory_05', image: 'images/story/mascot_welcome.png', text: "Мне казалось само собой разумеющимся: наступит праздник, и все соберутся. Даже в голову не приходило, что можно не суметь приехать." },
        { id: 'dressed_herring_memory_06', image: 'images/story/mascot_welcome.png', text: "Теперь сам готовлю и всё время вспоминаю, что ещё нужно сделать. Сколько же они тогда успевали, пока я охотился за подарками." },
        { id: 'dressed_herring_memory_07', image: 'images/story/mascot_welcome.png', text: "Сегодня тоже достал хорошую посуду. Всё берегу её для особого случая… День рождения вроде подходит." },
    ],
    cake: [
        { id: 'cake_memory_01', image: 'images/story/mascot_welcome.png', text: "Ну вот, добрались до торта! Сегодня мой день рождения. С утра то радуюсь, то начинаю подсчитывать, что уже должен был успеть." },
        { id: 'cake_memory_02', image: 'images/story/mascot_welcome.png', text: "Хотел устроить праздник как в детстве. Чтобы стол был заставлен вкусностями, которых немножко останется на завтра." },
        { id: 'cake_memory_03', image: 'images/story/mascot_welcome.png', text: "Пока готовил, столько всего вспомнил. Даже то, о чём давно не думал. Надеюсь, я тебя не слишком заболтал?" },
        { id: 'cake_memory_04', image: 'images/story/mascot_welcome.png', text: "Столько хорошего было. Почему-то, когда начинаю подводить итоги, не всё это учитываю. А надо бы." },
        { id: 'cake_memory_05', image: 'images/story/mascot_loves_pizza.png', text: "Меня окружают замечательные люди. Шаг за шагом иду к своей цели. Спасибо, что поддерживаете меня!", finale: true },
        { id: 'cake_memory_06', image: 'images/story/mascot_loves_pizza.png', text: "Держи кусочек. Я так ждал этой встречи. Спасибо, что ты пришёл!", finale: true },
    ],
};
