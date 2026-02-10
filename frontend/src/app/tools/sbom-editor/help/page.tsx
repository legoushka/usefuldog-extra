import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function SbomEditorHelpPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tools/sbom-editor">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Справка: SBOM Редактор
        </h1>
        <p className="text-muted-foreground">
          Руководство по работе с SBOM и ФСТЭК-требованиями
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["what-is-sbom"]} className="w-full">
        <AccordionItem value="what-is-sbom">
          <AccordionTrigger>Что такое SBOM и зачем он нужен</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>SBOM</strong> (Software Bill of Materials) — это формализованный перечень
                всех компонентов, библиотек и зависимостей, из которых состоит программный продукт.
                По аналогии с составом изделия в промышленности, SBOM описывает &quot;из чего сделано&quot;
                ваше ПО.
              </p>
              <p>
                SBOM необходим для:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Управления уязвимостями — быстрый поиск затронутых компонентов при обнаружении CVE</li>
                <li>Соответствия требованиям ФСТЭК — обязательная сертификация ПО для КИИ</li>
                <li>Лицензионного аудита — контроль используемых лицензий open-source</li>
                <li>Прозрачности цепочки поставок — понимание происхождения каждого компонента</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cyclonedx">
          <AccordionTrigger>Формат CycloneDX 1.6</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>CycloneDX</strong> — открытый стандарт OWASP для описания SBOM в формате
                JSON или XML. Версия 1.6 — актуальная на момент написания.
              </p>
              <h4 className="font-medium mt-2">Структура документа</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><code className="text-xs bg-muted px-1 rounded">bomFormat</code> — всегда &quot;CycloneDX&quot;</li>
                <li><code className="text-xs bg-muted px-1 rounded">specVersion</code> — версия спецификации (1.6)</li>
                <li><code className="text-xs bg-muted px-1 rounded">metadata</code> — информация о документе: timestamp, инструменты, основной компонент</li>
                <li><code className="text-xs bg-muted px-1 rounded">components[]</code> — перечень компонентов (тип, имя, версия, PURL, лицензии, вложенные компоненты)</li>
                <li><code className="text-xs bg-muted px-1 rounded">dependencies[]</code> — граф зависимостей между компонентами</li>
              </ul>
              <h4 className="font-medium mt-2">Типы компонентов</h4>
              <p>
                <code className="text-xs bg-muted px-1 rounded">application</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">library</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">framework</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">container</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">operating-system</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">device</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">firmware</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">file</code> и др.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fstec">
          <AccordionTrigger>Требования ФСТЭК — ГОСТ-поля</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm">
              <p>
                ФСТЭК России требует дополнительную информацию о компонентах ПО при сертификации.
                Эти данные передаются через расширения CycloneDX в массиве <code className="text-xs bg-muted px-1 rounded">properties[]</code>.
              </p>
              <h4 className="font-medium mt-2">ГОСТ-свойства</h4>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <code className="text-xs bg-muted px-1 rounded">cdx:gost:attack_surface</code> — влияет ли компонент на поверхность атаки.
                  Значения: <span className="text-green-600 font-medium">yes</span>,{" "}
                  <span className="text-yellow-600 font-medium">indirect</span>,{" "}
                  <span className="text-gray-500 font-medium">no</span>
                </li>
                <li>
                  <code className="text-xs bg-muted px-1 rounded">cdx:gost:security_function</code> — реализует ли компонент функции безопасности.
                  Значения: <span className="text-green-600 font-medium">yes</span>,{" "}
                  <span className="text-yellow-600 font-medium">indirect</span>,{" "}
                  <span className="text-gray-500 font-medium">no</span>
                </li>
                <li>
                  <code className="text-xs bg-muted px-1 rounded">cdx:gost:provided_by</code> — кем предоставлен компонент
                </li>
                <li>
                  <code className="text-xs bg-muted px-1 rounded">cdx:gost:source_langs</code> — языки исходного кода
                </li>
              </ul>
              <h4 className="font-medium mt-2">Правила иерархии</h4>
              <p>
                Для контейнерных SBOM действует правило: значение ГОСТ-свойства родительского
                компонента должно быть не ниже, чем у любого дочернего. Иерархия значений:
                yes (2) &gt; indirect (1) &gt; no (0). Валидатор проверяет это автоматически.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="generating">
          <AccordionTrigger>Как генерировать SBOM</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm">
              <h4 className="font-medium">cdxgen</h4>
              <p>
                Инструмент от CycloneDX для автоматической генерации SBOM из исходного кода или
                артефактов сборки.
              </p>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                npx @cyclonedx/cdxgen -o sbom.json
              </pre>

              <h4 className="font-medium mt-3">Dependency-Track</h4>
              <p>
                Платформа для управления зависимостями и уязвимостями. Позволяет загружать SBOM
                проектов, отслеживать уязвимости и экспортировать SBOM.
              </p>
              <p>
                Для экспорта SBOM из Dependency-Track используйте API:
              </p>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`curl -H "X-Api-Key: YOUR_KEY" \\
  https://dtrack.example.com/api/v1/bom/cyclonedx/project/{uuid} \\
  -o sbom.json`}
              </pre>

              <h4 className="font-medium mt-3">Другие инструменты</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Syft</strong> — генерация SBOM для контейнерных образов</li>
                <li><strong>Trivy</strong> — сканер уязвимостей с функцией генерации SBOM</li>
                <li><strong>SPDX tools</strong> — для работы с форматом SPDX (конвертация в CycloneDX)</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="editor-guide">
          <AccordionTrigger>Как использовать SBOM Редактор</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 text-sm">
              <h4 className="font-medium">Просмотр</h4>
              <p>
                Загрузите CycloneDX JSON файл через зону загрузки. Во вкладке &quot;Просмотр&quot;
                вы увидите метаданные, статистику по типам компонентов и лицензиям,
                дерево компонентов с ГОСТ-бейджами и граф зависимостей.
              </p>

              <h4 className="font-medium">Редактирование</h4>
              <p>
                Вкладка &quot;Редактирование&quot; предлагает два режима:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Визуальный</strong> — форма редактирования с деревом компонентов слева и полями справа</li>
                <li><strong>Текстовый</strong> — JSON-редактор с подсветкой синтаксиса (CodeMirror)</li>
              </ul>
              <p>
                Изменения синхронизируются между режимами. Скачайте результат кнопкой &quot;Скачать JSON&quot;.
              </p>

              <h4 className="font-medium">Объединение</h4>
              <p>
                Загрузите 2+ SBOM файла из разных проектов DependencyTrack. Укажите название
                и версию приложения, производителя. Нажмите &quot;Объединить&quot; — результат
                загрузится во вкладки Просмотр и Редактирование.
              </p>

              <h4 className="font-medium">Валидация</h4>
              <p>
                Проверяет SBOM по правилам CycloneDX и ФСТЭК: структура документа,
                обязательные поля компонентов, иерархия ГОСТ-свойств. Кликните на путь ошибки
                для навигации к проблемному компоненту.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="links">
          <AccordionTrigger>Ссылки на ресурсы</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-sm">
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <a
                    href="https://cyclonedx.org/specification/overview/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    CycloneDX Specification
                  </a>
                  {" "}— официальная спецификация формата
                </li>
                <li>
                  <a
                    href="https://github.com/CycloneDX/cdxgen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    cdxgen
                  </a>
                  {" "}— генератор SBOM от CycloneDX
                </li>
                <li>
                  <a
                    href="https://dependencytrack.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Dependency-Track
                  </a>
                  {" "}— платформа управления зависимостями
                </li>
                <li>
                  <a
                    href="https://fstec.ru/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    ФСТЭК России
                  </a>
                  {" "}— официальный сайт регулятора
                </li>
                <li>
                  <a
                    href="https://owasp.org/www-project-cyclonedx/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OWASP CycloneDX Project
                  </a>
                  {" "}— страница проекта OWASP
                </li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
