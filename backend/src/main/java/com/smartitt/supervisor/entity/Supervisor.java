package com.smartitt.supervisor.entity;

import com.smartitt.terminal.entity.Terminal;
import com.smartitt.user.entity.User;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "supervisors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Supervisor extends User {

    @ManyToOne
    @JoinColumn(name = "assigned_terminal_id", nullable = true)
    private Terminal assignedTerminal;

}
