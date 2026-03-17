// One-off script to inspect XLSX structure. Run: go run scripts/inspect_xlsx.go <path-to-xlsx>
package main

import (
	"fmt"
	"os"

	"github.com/xuri/excelize/v2"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run scripts/inspect_xlsx.go <path-to-xlsx>")
		os.Exit(1)
	}
	path := os.Args[1]
	f, err := excelize.OpenFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Open: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()
	sheets := f.GetSheetList()
	fmt.Printf("Sheets: %q\n", sheets)
	for _, name := range sheets {
		rows, err := f.GetRows(name)
		if err != nil {
			fmt.Fprintf(os.Stderr, "GetRows %q: %v\n", name, err)
			continue
		}
		fmt.Printf("\n--- Sheet %q: %d rows ---\n", name, len(rows))
		maxShow := 25
		if len(rows) < maxShow {
			maxShow = len(rows)
		}
		for i, row := range rows {
			if i >= maxShow {
				fmt.Printf("... (%d more rows)\n", len(rows)-maxShow)
				break
			}
			fmt.Printf("Row %d (%d cells): %q\n", i+1, len(row), row)
		}
	}
}
