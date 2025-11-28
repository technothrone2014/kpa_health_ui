import { useState, useMemo } from "react";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Paper,
  CircularProgress,
  TextField,
  TableSortLabel,
  Toolbar,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "../api/employees";
import { Employee } from "../types/Employee";

type Order = "asc" | "desc";

export default function Employees() {
  const { data, isLoading, error } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof Employee>("FullName");
  const [order, setOrder] = useState<Order>("asc");

  // --- Sorting logic ---
  const handleSort = (property: keyof Employee) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data
      .filter((emp) =>
        Object.values(emp)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];
        if (aValue < bValue) return order === "asc" ? -1 : 1;
        if (aValue > bValue) return order === "asc" ? 1 : -1;
        return 0;
      });
  }, [data, search, order, orderBy]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );

  if (error) return <div>Error loading employees</div>;

  return (
    <Paper sx={{ width: "100%", p: 2 }}>
      {/* Header and Search */}
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6" component="div">
          Employees Dashboard
        </Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Toolbar>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "Id"}
                  direction={orderBy === "Id" ? order : "asc"}
                  onClick={() => handleSort("Id")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "FullName"}
                  direction={orderBy === "FullName" ? order : "asc"}
                  onClick={() => handleSort("FullName")}
                >
                  Full Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "CategoryTitle"}
                  direction={orderBy === "CategoryTitle" ? order : "asc"}
                  onClick={() => handleSort("CategoryTitle")}
                >
                  Category
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "StationTitle"}
                  direction={orderBy === "StationTitle" ? order : "asc"}
                  onClick={() => handleSort("StationTitle")}
                >
                  Station
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.map((emp) => (
              <TableRow key={emp.Id} hover>
                <TableCell>{emp.Id}</TableCell>
                <TableCell>{emp.FullName}</TableCell>
                <TableCell>{emp.CategoryTitle}</TableCell>
                <TableCell>{emp.StationTitle}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
}
